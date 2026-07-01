from rest_framework import viewsets
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.all()
        if self.action == 'list':
            # Prefetch inventory to avoid N+1 queries
            queryset = queryset.prefetch_related('inventory_set')
        return queryset
