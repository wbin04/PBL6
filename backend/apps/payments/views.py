import os
import time
import random
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from decouple import config
from payos import PaymentData, PayOS


# Initialize PayOS
payOs = PayOS(
    client_id=config('PAYOS_CLIENT_ID', default=''),
    api_key=config('PAYOS_API_KEY', default=''),
    checksum_key=config('PAYOS_CHECKSUM_KEY', default='')
)


def gen_unique_order_code(base_id: str | int) -> int:
    """Generate unique order code for PayOS - max 9 digits"""
    import time
    import random
    
    # Use last 4 digits of timestamp
    ts = int(time.time()) % 10000
    # Random 3 digits
    rnd = random.randint(100, 999)
    # Combine: base_id (2 digits) + timestamp (4 digits) + random (3 digits) = 9 digits max
    base = int(str(base_id)[-2:]) if base_id else 0
    
    order_code = int(f"{base:02d}{ts:04d}{rnd:03d}")
    
    print(f"Generated order code: {order_code} (9 digits)")
    return order_code


def _get_payment_link_info(order_code: int):
    """Get payment link information from PayOS"""
    try:
        return payOs.get_payment_link_information(order_code)
    except AttributeError:
        return payOs.getPaymentLinkInformation(order_code)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_link(request):
    """Create PayOS payment link for bank transfer"""
    try:
        data = request.data
        user_id = data.get('user_id')
        order_id = str(data.get('order_id'))
        amount = int(data.get('amount', 0))
        message = data.get('message') or f"Order #{order_id}"

        print(f"=== CREATE PAYMENT LINK ===")
        print(f"User ID: {user_id}")
        print(f"Order ID: {order_id}")
        print(f"Amount: {amount}")
        print(f"Message: {message}")

        if not order_id or amount <= 0:
            print(f"ERROR: Invalid order_id or amount")
            return Response(
                {'error': 'Thiếu order_id hoặc amount không hợp lệ'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        primary_order_code = int(order_id)
        
        # Check if payment link already exists
        try:
            print(f"Checking existing payment link for order code: {primary_order_code}")
            info = _get_payment_link_info(primary_order_code)
            link_status = getattr(info, 'status', None) or (info.get('status') if isinstance(info, dict) else None)
            checkout_url = getattr(info, 'checkoutUrl', None) or (info.get('checkoutUrl') if isinstance(info, dict) else None)
            
            print(f"Existing link status: {link_status}, URL: {checkout_url}")
            
            if link_status in ('PENDING', 'PROCESSING') and checkout_url:
                print(f"Returning existing payment link")
                return Response({
                    'checkoutUrl': checkout_url, 
                    'status': link_status, 
                    'orderCode': primary_order_code
                })
            
            if link_status == 'PAID':
                print(f"Order already paid")
                return Response(
                    {'error': 'Đơn này đã thanh toán.'}, 
                    status=status.HTTP_409_CONFLICT
                )
        except Exception as e:
            print(f"No existing payment link found (this is normal): {e}")
            pass

        # Create new payment link
        new_order_code = gen_unique_order_code(order_id)
        print(f"Generated new order code: {new_order_code}")
        
        # Validate order code length (PayOS max is usually 9-10 digits)
        if new_order_code > 9999999999:  # 10 digits max
            print(f"ERROR: Order code too long: {new_order_code}")
            return Response(
                {'error': f'Order code too long: {new_order_code}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get host URL for return/cancel URLs
        host_url = request.build_absolute_uri('/').rstrip('/')
        print(f"Host URL: {host_url}")
        
        paymentData = PaymentData(
            orderCode=new_order_code,
            amount=amount,
            description=message,
            returnUrl=f"{host_url}/api/payments/payos-return?orderCode={new_order_code}&status=success",
            cancelUrl=f"{host_url}/api/payments/payos-return?orderCode={new_order_code}&status=cancel"
        )
        
        print(f"Payment data created: orderCode={new_order_code}, amount={amount}")
        print(f"Calling PayOS API to create payment link...")
        
        try:
            created = payOs.create_payment_link(paymentData)
            print("Successfully used method: create_payment_link")
        except AttributeError:
            print(f"Using alternative method: createPaymentLink")
            created = payOs.createPaymentLink(paymentData=paymentData)
            print("Successfully used method: createPaymentLink")
        except Exception as e:
            print(f"=== ERROR IN CREATE PAYMENT LINK ===")
            print(f"Error type: {type(e)}")
            print(f"Error message: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

        print(f"PayOS response type: {type(created)}")
        print(f"PayOS response: {created}")

        checkout_url = getattr(created, 'checkoutUrl', None) or (created.get('checkoutUrl') if isinstance(created, dict) else None)
        
        if not checkout_url:
            print(f"ERROR: No checkoutUrl in response")
            return Response(
                {'error': 'Không nhận được checkoutUrl từ PayOS'}, 
                status=status.HTTP_502_BAD_GATEWAY
            )

        print(f"SUCCESS: Payment link created: {checkout_url}")
        return Response({
            'checkoutUrl': checkout_url, 
            'status': 'CREATED', 
            'orderCode': new_order_code
        })

    except Exception as e:
        print(f"=== ERROR IN CREATE PAYMENT LINK ===")
        print(f"Error type: {type(e)}")
        print(f"Error message: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def payos_return(request):
    """Handle PayOS return callback - sends postMessage to opener window"""
    order_code = request.GET.get('orderCode', '')
    payment_status = request.GET.get('status', 'cancel')
    
    # Map status for postMessage
    pm_status = 'success' if payment_status == 'success' else 'cancel'
    
    # HTML response that sends postMessage to opener, then closes
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kết quả thanh toán</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
            }}
            .container {{
                text-align: center;
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            .success {{ color: #4CAF50; }}
            .cancel {{ color: #f44336; }}
            h1 {{ margin-bottom: 20px; }}
            p {{ color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1 class="{'success' if payment_status == 'success' else 'cancel'}">
                {'✓ Thanh toán thành công!' if payment_status == 'success' else '✗ Đã hủy thanh toán'}
            </h1>
            <p>Mã đơn hàng: {order_code}</p>
            <p>Đang xử lý...</p>
        </div>
        <script>
            (function() {{
                var orderCode = '{order_code}';
                var status = '{pm_status}';
                
                // Send postMessage to opener window (React app)
                try {{
                    if (window.opener && !window.opener.closed) {{
                        // Try to send to any origin since opener could be localhost or production
                        window.opener.postMessage(
                            {{ type: 'PAYOS_RESULT', status: status, orderCode: orderCode }},
                            '*'
                        );
                        console.log('postMessage sent:', {{ type: 'PAYOS_RESULT', status: status, orderCode: orderCode }});
                    }} else {{
                        console.log('No opener window found');
                    }}
                }} catch (e) {{
                    console.error('Error sending postMessage:', e);
                }}
                
                // Close window after short delay
                setTimeout(function() {{
                    window.close();
                }}, 1000);
            }})();
        </script>
    </body>
    </html>
    """
    
    from django.http import HttpResponse
    return HttpResponse(html)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_payment_status(request):
    """Check payment status from PayOS"""
    try:
        order_code = request.data.get('orderCode')
        
        if not order_code:
            return Response(
                {'error': 'orderCode is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        info = _get_payment_link_info(int(order_code))
        payment_status = getattr(info, 'status', None) or (info.get('status') if isinstance(info, dict) else None)
        
        return Response({
            'orderCode': order_code,
            'status': payment_status,
            'paid': payment_status == 'PAID'
        })
        
    except Exception as e:
        print(f"Error checking payment status: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def create_payment(request):
    """Mock payment creation - will be implemented when payment system is added"""
    order_id = request.data.get('order_id')
    method = request.data.get('method', 'COD')
    
    return Response({
        'message': f'Payment method {method} for order {order_id} processed',
        'method': method,
        'status': 'success'
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def payment_webhook(request):
    """Mock payment webhook - will be implemented when payment system is added"""
    return Response({'success': True})

