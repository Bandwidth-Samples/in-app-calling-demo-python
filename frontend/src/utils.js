/**
 * Fetches a new JWT from the backend server
 *
 * @returns {Promise<string>}
 */
export async function refreshToken() {
    const tokenUrl = 'http://localhost:3001/bandwidth/authorization/token';

    try {
        const response = await fetch(tokenUrl, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status} from backend - ${response.statusText} ` + await response.text());
        }

        return await response.text();
    } catch (error) {
        console.error('Error fetching auth token:', error);
        throw error;
    }
}

/**
 * Checks if the authToken is expired
 *
 * @param jwt
 * @returns {boolean}
 */
export function isJwtExpired(jwt) {
    const jwtParts = jwt.split('.');
    if (jwtParts.length !== 3) {
        return true;
    }

    try {
        const payload = JSON.parse(atob(jwtParts[1]));
        if (payload.exp) {
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            return expirationTime < currentTime;
        }
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return true;
    }

    return true;
}
