import asyncio
import json
import logging
import os

from bandwidth.models import InitiateCallback, DisconnectCallback, RedirectCallback
from bandwidth.models.bxml import Response as BxmlResponse
from bandwidth.models.bxml import Bridge, SpeakSentence, Ring, Redirect
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response
import jwt
import redis
import requests
from starlette.middleware.cors import CORSMiddleware
import threading
import uvicorn

try:
    BW_USERNAME = os.environ.get("BW_USERNAME")
    BW_PASSWORD = os.environ.get("BW_PASSWORD")
    IN_APP_CALLING_NUMBER = os.environ.get("REACT_APP_BW_FROM_NUMBER")
    LOG_LEVEL = os.environ.get("LOGGING_LEVEL", "INFO")
except KeyError as e:
    print(f"Missing environment variable: {e}. Did you set up your .env file?")
    exit(1)

logger = logging.getLogger('uvicorn.error')
logging.basicConfig(level=LOG_LEVEL)

app = FastAPI()

# CORS Middleware for the Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

connected_clients = []

bandwidth_auth_token = ""

def fetch_bandwidth_token() -> str:
    """
    Fetch a new Bandwidth token from the Oauth Endpoint

    :return: str
    """
    logger.info("Fetching new Bandwidth token")
    bandwidth_token_url = "https://id.bandwidth.com/api/v1/oauth2/token"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {
        "grant_type": "client_credentials"
    }
    r = requests.post(bandwidth_token_url, auth=(BW_USERNAME, BW_PASSWORD), headers=headers, data=payload)
    return r.json()["access_token"]

def generate_jwt() -> str:
    """
    Generate a JWT for Bandwidth

    :return: str
    """
    global bandwidth_auth_token

    if not bandwidth_auth_token:
        bandwidth_auth_token = fetch_bandwidth_token()

    try:
        jwt.decode(bandwidth_auth_token, options={"verify_signature": False})
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        logger.error("JWT is invalid or has expired")
        bandwidth_auth_token = fetch_bandwidth_token()
    except Exception as e:
        logger.error(f"Error decoding JWT: {e}")
        bandwidth_auth_token = fetch_bandwidth_token()

    return bandwidth_auth_token.replace('"', "")

async def handle_message(message) -> None:
    """
    Handle incoming message from Redis

    :param message: dict
    :return: None
    """
    logger.debug(f"Redis message received: {message['data']}")
    for client in connected_clients:
        try:
            await client.send_text(message['data'])
            logger.debug(f"Message sent to client: {message['data']}")
        except Exception as e:
            logger.error(f"Error sending message: {e}")


def redis_listener() -> None:
    """
    Initialize the listener for incoming messages from Redis using PubSub

    :return: None
    """
    logger.debug("Starting Redis listener")
    pubsub = redis_client.pubsub()
    try:
        pubsub.subscribe("calls")
    except Exception as e:
        logger.error(f"Error subscribing to Redis channel: {e} Is the redis server running?")
        exit(1)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    for message in pubsub.listen():
        if message['type'] == 'message':
            loop.run_until_complete(handle_message(message))


def start_redis_listener() -> None:
    """
    Start the Redis listener in a separate thread

    :return: None
    """
    listener_thread = threading.Thread(target=redis_listener, daemon=True)
    listener_thread.start()


start_redis_listener()

@app.get("/health", status_code=204)
def health_check() -> None:
    """
    Health check endpoint
    :return: None
    """
    return


@app.get(path="/bandwidth/authorization/token", status_code=200)
def get_bandwidth_token() -> Response:
    """
    Get Bandwidth JWT from the Oauth Endpoint
    :return: FastAPI Response
    """
    try:
        token = generate_jwt()
    except Exception as e:
        logger.error(f"Error generating JWT: {e}")
        return Response(status_code=500, content="Error generating JWT")

    # return token with quotes removed
    return Response(content=generate_jwt(), headers={"Content-Type": "text/plain"})


@app.websocket("/bandwidth/notifications/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for notifications

    :param websocket: WebSocket to connect
    :return: None
    """
    await websocket.accept()
    logger.info("WebSocket connected")
    connected_clients.append(websocket)
    logger.debug(f"Connected clients: {len(connected_clients)}")

    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
        connected_clients.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connected_clients.remove(websocket)
        await websocket.close()


@app.post("/bandwidth/webhooks/voice/disconnect", status_code=204)
def handle_disconnect(callback: DisconnectCallback):
    """
    Handle disconnect callback from Bandwidth. Returns a 204.

    :param callback: The DisconnectCallback object
    :return: None
    """
    logger.info(f"Received disconnect for call {callback.call_id}")
    logger.debug(callback)
    return


@app.post("/bandwidth/webhooks/voice/initiate")
def handle_inbound_call(callback: InitiateCallback) -> Response:
    """
    The main inbound callback handler. This handles calls from 3rd party customers and our agents. It is the bulk of the logic for the voice application.
    If a call comes in from our agent, we bridge the call to the customer. If a call comes in from a customer, we notify the frontend and play a message to the customer.

    :param callback: The InitiateCallback object
    :return: Returns a BXML response utilizing the FastAPI Response Model
    """
    logger.info(f"Received inbound call from {callback.var_from}")
    logger.debug(callback)

    if callback.var_from == IN_APP_CALLING_NUMBER:
        logger.info("Received call from our agent to bridge")
        customer_call_id = redis_client.get("inbound_call_id")
        bridge = Bridge(target_call=customer_call_id)
        response = BxmlResponse([bridge])
        return Response(status_code=200, content=response.to_bxml(), media_type="application/xml")
    else:
        logger.info("Received call from a customer")
        redis_client.set("inbound_call_id", callback.call_id)
        message = {
            "type": "call",
            "data": {
                "fromNumber": callback.var_from,
                "callId": callback.call_id
            }
        }
        redis_client.publish("calls", json.dumps(message))

        speak_sentence = SpeakSentence(
            text="Thank you for calling Bandwidth. Please wait while we connect you to an agent."
        )
        ring = Ring(
            duration=10
        )
        redirect = Redirect(
            redirect_url="/bandwidth/webhooks/voice/redirect"
        )
        response = BxmlResponse([speak_sentence, ring, redirect])
        return Response(status_code=200, content=response.to_bxml(), media_type="application/xml")


@app.post("/bandwidth/webhooks/voice/redirect")
def handle_redirected_call(callback: RedirectCallback) -> Response:
    """
    The redirect callback handler. This is where an inbound customer is "parked" while waiting for an agent to accept the call.

    :param callback: The RedirectCallback object
    :return: Returns a BXML response utilizing the FastAPI Response Model
    """
    logger.info(f"Received redirected call from {callback.var_from}")
    logger.debug(callback)
    ring = Ring(
        duration=10
    )
    redirect = Redirect(
        redirect_url="/bandwidth/webhooks/voice/redirect"
    )
    response = BxmlResponse([ring, redirect])
    return Response(status_code=200, content=response.to_bxml(), media_type="application/xml")


def start_server(port: int) -> None:
    """
    Start the FastAPI server

    :param port: The port to run the server on
    :return: None
    """
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        log_level="debug",
        reload=True,
    )


if __name__ == "__main__":
    start_server(8080)
