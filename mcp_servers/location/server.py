import math

from mcp.server.mcpserver import MCPServer
from database.database import get_connection

mcp = MCPServer("Location")


# Calculate the distance between two geographic coordinates
# using the Haversine formula.
def calculate_distance(
    latitude1: float, longitude1: float, latitude2: float, longitude2: float
) -> float:
    earth_radius = 6371.0

    lat1 = math.radians(latitude1)
    lat2 = math.radians(latitude2)

    delta_lat = math.radians(latitude2 - latitude1)
    delta_lon = math.radians(longitude2 - longitude1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return earth_radius * c


@mcp.tool()
def find_nearest_branch(latitude: float, longitude: float) -> dict:
    """Find the nearest bank branch to the given location."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, name, latitude, longitude, address
        FROM branches
    """)

    branches = cursor.fetchall()
    connection.close()

    if not branches:
        return {"success": False, "error": "No branches found"}

    nearest_branch = None
    nearest_distance = None

    for branch in branches:
        distance = calculate_distance(latitude, longitude, branch[2], branch[3])

        if nearest_distance is None or distance < nearest_distance:
            nearest_distance = distance
            nearest_branch = branch

    return {
        "success": True,
        "branch": {
            "id": nearest_branch[0],
            "name": nearest_branch[1],
            "latitude": nearest_branch[2],
            "longitude": nearest_branch[3],
            "address": nearest_branch[4],
            "distance_km": round(nearest_distance, 2),
        },
    }


@mcp.tool()
def find_nearest_atm(latitude: float, longitude: float) -> dict:
    """Find the nearest ATM to the given location."""

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, name, latitude, longitude, address
        FROM atms
    """)

    atms = cursor.fetchall()
    connection.close()

    if not atms:
        return {"success": False, "error": "No ATMs found"}

    nearest_atm = None
    nearest_distance = None

    for atm in atms:
        distance = calculate_distance(latitude, longitude, atm[2], atm[3])

        if nearest_distance is None or distance < nearest_distance:
            nearest_distance = distance
            nearest_atm = atm

    return {
        "success": True,
        "atm": {
            "id": nearest_atm[0],
            "name": nearest_atm[1],
            "latitude": nearest_atm[2],
            "longitude": nearest_atm[3],
            "address": nearest_atm[4],
            "distance_km": round(nearest_distance, 2),
        },
    }


if __name__ == "__main__":
    mcp.run()
