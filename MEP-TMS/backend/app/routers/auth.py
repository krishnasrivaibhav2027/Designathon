from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta
from app.schemas.schemas import LoginRequest, LoginResponse, TokenValidate, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, decode_token, get_current_user
from app.core.database import get_db
from app.models.models import User, UserRole
from bson.objectid import ObjectId

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(user_data: dict):
    """Register a new user"""
    db = get_db()
    
    # Check if user already exists
    existing_user = await db["users"].find_one({"email": user_data.get("email")})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
    
    # Create new user
    user = User(
        email=user_data.get("email"),
        fullName=user_data.get("fullName"),
        passwordHash=hash_password(user_data.get("password")),
        role=user_data.get("role", UserRole.TRAINER),
        phone=user_data.get("phone")
    )
    
    result = await db["users"].insert_one(user.to_dict())
    created_user = await db["users"].find_one({"_id": result.inserted_id})
    
    return UserResponse(**created_user)

@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Login user"""
    db = get_db()
    
    # Find user by email
    user = await db["users"].find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user.get("passwordHash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": str(user["_id"]),
            "email": user.get("email"),
            "role": user.get("role")
        }
    )
    
    user_response = UserResponse(**user)
    
    return LoginResponse(
        accessToken=access_token,
        user=user_response,
        expiresIn=3600  # 1 hour
    )

@router.get("/validate", response_model=TokenValidate)
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Validate JWT token"""
    db = get_db()
    
    # Fetch current user data
    user = await db["users"].find_one({"_id": ObjectId(current_user.get("sub"))})
    
    if not user:
        return TokenValidate(isValid=False)
    
    user_response = UserResponse(**user)
    return TokenValidate(isValid=True, user=user_response)

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user (token invalidation handled by client)"""
    return {"message": "Logged out successfully"}
