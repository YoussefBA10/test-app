from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseServerError

def success(request):
    return JsonResponse({"message": "Success! Status 200"})

def client_error(request):
    return JsonResponse({"error": "Client Error! Status 400"}, status=400)

def server_error(request):
    return JsonResponse({"error": "Server Error! Status 500"}, status=500)
