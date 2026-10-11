import requests
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
def github_auth(request):
    """
    Exchange a GitHub OAuth code for an access token.

    Expects JSON body: { "code": "abc123" }
    Returns JSON:      { "access_token": "gho_xxxx" }
    """
    code = request.data.get('code')

    if not code:
        return Response(
            {'error': 'Code is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Exchange the code for an access token
    token_response = requests.post(
        'https://github.com/login/oauth/access_token',
        json={
            'client_id': settings.GITHUB_CLIENT_ID,
            'client_secret': settings.GITHUB_CLIENT_SECRET,
            'code': code,
        },
        headers={
            'Accept': 'application/json',
        },
    )

    token_data = token_response.json()

    if 'error' in token_data:
        return Response(
            {
                'error': token_data['error'],
                'description': token_data.get('error_description', ''),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response({'access_token': token_data['access_token']})


@api_view(['GET'])
def health_check(request):
    """Simple health check endpoint."""
    return Response({'status': 'ok'})
