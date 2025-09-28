from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view that sets refresh token in httpOnly cookie"""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            token = RefreshToken(response.data['refresh'])

            # Set refresh token in httpOnly cookie
            response.set_cookie(
                'refresh_token',
                str(token),
                max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                samesite='Lax',  # Changed from Strict to Lax for tunnel compatibility
                secure=False  # Set to False for development with tunnels
            )

            # Remove refresh token from response body for security
            response.data.pop('refresh', None)

        return response


class CustomTokenRefreshView(TokenRefreshView):
    """Custom refresh view that reads refresh token from httpOnly cookie"""

    def post(self, request, *args, **kwargs):
        # Get refresh token from cookie
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token not found in cookies'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Add refresh token to request data
        request.data['refresh'] = refresh_token

        response = super().post(request, *args, **kwargs)

        # If refresh was successful, update the cookie with new refresh token
        if response.status_code == 200 and 'refresh' in response.data:
            new_refresh_token = response.data['refresh']

            response.set_cookie(
                'refresh_token',
                new_refresh_token,
                max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                samesite='Lax',  # Changed from Strict to Lax for tunnel compatibility
                secure=False  # Set to False for development with tunnels
            )

            # Remove refresh token from response body
            response.data.pop('refresh', None)

        return response