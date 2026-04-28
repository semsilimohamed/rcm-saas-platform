from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Loading environment variables from .env file
load_dotenv()

# Creating the FASTAPI application
app = FastAPI(
    title = "RCM SaaS Plateform",
    description = "Revenue Cycle Management API FOR Morrocan Healthcare",
    version = "1.0.0"
)

#Allow the frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update this with the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
# Health check endpoint - confirms the server is running
@app.get("/")
def root():
    return{
        "status" : "online ",
        "plateform" : "RCM SaaS",
        "version" : "1.0.0"
    }
app.get("/health")
def health():
    return {"status": "healthy"}