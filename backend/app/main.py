from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import sensors, dashboard

app = FastAPI(title="TeleSol API", version="2.1.0")

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensors.router)
app.include_router(dashboard.router)


@app.get("/")
async def root():
    return {"name": "TeleSol API", "version": "2.1.0", "status": "running"}
