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

# 1. Resolve frontend dist directory relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "Frontend", "dist"))
ASSETS_DIR = os.path.join(FRONTEND_DIST, "assets")

if os.path.isdir(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# 2. Catch-all route for the React Single Page Application (SPA)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    file_path = os.path.join(FRONTEND_DIST, full_path)
    # Serve the static file if it exists (e.g., favicon.ico, images)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # Fallback to React index.html if built
    index_html = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.isfile(index_html):
        return FileResponse(index_html)
    return {
        "status": "online",
        "message": "AI Code Explainer API is running.",
        "docs": "/docs",
        "frontend": "Frontend dist is not yet built. Run 'npm run build' inside Frontend/."
    }