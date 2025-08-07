from fastapi import Request
from fastapi.responses import JSONResponse

async def http_error_handler(_: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": str(exc)})
