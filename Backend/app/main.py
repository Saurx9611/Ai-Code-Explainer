from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router as api_router
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

app.mount("/assets", StaticFiles(directory="../Frontend/dist/assets"), name="assets")

# 2. Catch-all route for the React Single Page Application (SPA)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    file_path = os.path.join("../Frontend/dist", full_path)
    # Serve the file if it exists (e.g., favicon.ico, images)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # Otherwise, fallback to React's index.html
    return FileResponse("../Frontend/dist/index.html")