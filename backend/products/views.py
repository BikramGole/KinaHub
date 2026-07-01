from rest_framework import generics
from .models import Product
from .serializers import ProductSerializer

class ProductListView(generics.ListAPIView):
    queryset = Product.objects.all().prefetch_related('productsinventory_set')
    serializer_class = ProductSerializer
