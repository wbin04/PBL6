from django.db import models
from apps.authentication.models import User


class ChatSession(models.Model):
    """Store chat sessions for users"""
    session_id = models.CharField(max_length=255, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    state = models.JSONField(default=dict, blank=True)  # Store conversation state
    
    class Meta:
        db_table = 'chatbot_session'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Session {self.session_id}"


class ChatMessage(models.Model):
    """Store chat messages"""
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    message = models.TextField()
    is_user = models.BooleanField(default=True)
    intent = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chatbot_message'
        ordering = ['created_at']

    def __str__(self):
        return f"{'User' if self.is_user else 'Bot'}: {self.message[:50]}"


class ChatCart(models.Model):
    """Temporary cart for chatbot orders"""
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='cart_items')
    food = models.ForeignKey('menu.Food', on_delete=models.CASCADE)
    food_size = models.ForeignKey('menu.FoodSize', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chatbot_cart'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.food.title} x{self.quantity}"

    @property
    def total_price(self):
        if self.food_size:
            return self.food_size.price * self.quantity
        return self.food.price * self.quantity
