from django.shortcuts import render

"""
users/views.py - DRF Views for User Registration and Authentication
"""

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiResponse
from .permissions import IsAdmin

from .models import User
from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    PasswordChangeSerializer,
    UserUpdateSerializer
)
from .jwt_serializers import CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.
    
    POST /api/v1/auth/register/
    
    Features:
    - Email uniqueness validation
    - Password strength validation (Django validators)
    - Automatic bcrypt password hashing
    - Role assignment (default: staff)
    - Returns user data (no auto-login)
    """
    
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]  # Public endpoint
    
    @extend_schema(
        summary="Register a new user",
        description="""
        Register a new user account with email and password.
        
        Password requirements:
        - At least 8 characters
        - Cannot be entirely numeric
        - Cannot be too similar to personal information
        - Cannot be a commonly used password
        
        Default role is 'staff'. Only admins can create users with other roles.
        """,
        responses={
            201: UserSerializer,
            400: OpenApiResponse(description="Validation error")
        },
        tags=['Authentication']
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            
            # Return user data with success message
            return Response(
                {
                    'message': 'User registered successfully',
                    'user': UserSerializer(user).data
                },
                status=status.HTTP_201_CREATED
            )
        
        return Response(
            {
                'message': 'Registration failed',
                'errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom login view with role claims in JWT.
    
    POST /api/v1/auth/login/
    
    Returns:
    - access: JWT access token (with role claims)
    - refresh: JWT refresh token
    - user: User profile data
    """
    
    serializer_class = CustomTokenObtainPairSerializer
    
    @extend_schema(
        summary="Login and obtain JWT tokens",
        description="""
        Authenticate with email and password to receive JWT tokens.
        
        The access token includes custom claims:
        - role: User role for RBAC
        - email, username, full_name
        - warehouse information (if assigned)
        - permission flags (can_approve_recalls, can_manage_stock, etc.)
        
        Use the access token in Authorization header: Bearer <token>
        """,
        tags=['Authentication']
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(APIView):
    """
    Logout endpoint - blacklist refresh token.
    
    POST /api/v1/auth/logout/
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Logout and blacklist refresh token",
        description="""
        Logout by blacklisting the refresh token.
        The access token will remain valid until expiration.
        
        Send the refresh token in request body.
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'refresh': {'type': 'string'}
                },
                'required': ['refresh']
            }
        },
        responses={
            205: OpenApiResponse(description="Successfully logged out"),
            400: OpenApiResponse(description="Refresh token required")
        },
        tags=['Authentication']
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response(
                {'message': 'Successfully logged out'},
                status=status.HTTP_205_RESET_CONTENT
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user profile.
    
    GET /api/v1/auth/profile/
    PATCH /api/v1/auth/profile/
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UserUpdateSerializer
    
    def get_object(self):
        """Return the current authenticated user"""
        return self.request.user
    
    @extend_schema(
        summary="Get current user profile",
        description="Retrieve the authenticated user's profile information.",
        responses={200: UserSerializer},
        tags=['Users']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update current user profile",
        description="Update the authenticated user's profile (first_name, last_name, assigned_warehouse).",
        request=UserUpdateSerializer,
        responses={200: UserSerializer},
        tags=['Users']
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class PasswordChangeView(APIView):
    """
    Change password for authenticated user.
    
    POST /api/v1/auth/password/change/
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Change password",
        description="""
        Change the current user's password.
        Requires: old_password, new_password, new_password_confirm
        """,
        request=PasswordChangeSerializer,
        responses={
            200: OpenApiResponse(description="Password changed successfully"),
            400: OpenApiResponse(description="Validation error")
        },
        tags=['Users']
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': 'Password changed successfully'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class UserListView(generics.ListAPIView):
    """
    List all users (admin only).
    
    GET /api/v1/users/
    """
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    
    @extend_schema(
        summary="List all users",
        description="Get a list of all users (admin only).",
        responses={200: UserSerializer(many=True)},
        tags=['Users']
    )
    def get(self, request, *args, **kwargs):
        # TODO: Add permission check for admin role
        # For now, any authenticated user can list
        return super().get(request, *args, **kwargs)


class UserDetailView(generics.RetrieveAPIView):
    """
    Get user details by ID (admin only).
    
    GET /api/v1/users/{id}/
    """
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    lookup_field = 'id'
    
    @extend_schema(
        summary="Get user details",
        description="Retrieve details of a specific user by ID (admin only).",
        responses={200: UserSerializer},
        tags=['Users']
    )
    def get(self, request, *args, **kwargs):
        # TODO: Add permission check for admin role
        return super().get(request, *args, **kwargs)


# ============================================================================
# Health Check / Test Endpoints
# ============================================================================

@extend_schema(
    summary="Check if user is authenticated",
    description="Test endpoint to verify JWT authentication is working.",
    responses={
        200: OpenApiResponse(description="User is authenticated"),
        401: OpenApiResponse(description="User is not authenticated")
    },
    tags=['Development']
)
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def test_auth(request):
    """
    Test endpoint to verify authentication is working.
    
    GET /api/v1/auth/test/
    """
    return Response({
        'message': 'Authentication successful',
        'user': {
            'id': str(request.user.id),
            'email': request.user.email,
            'role': request.user.role,
            'is_authenticated': request.user.is_authenticated
        }
    })

# Create your views here.
