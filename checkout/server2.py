import os
import io
import base64
import qrcode
import crcmod
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')

class VietQRGenerator:
    def __init__(self, bank_bin, account_number, account_name):
        self.bank_bin = str(bank_bin).strip()
        # Làm sạch account number - chỉ giữ lại số
        self.account_number = ''.join(c for c in str(account_number) if c.isdigit())
        self.account_name = str(account_name).strip()
        
        # Validate inputs
        if len(self.bank_bin) != 6 or not self.bank_bin.isdigit():
            raise ValueError(f"Bank BIN phải có đúng 6 số: {self.bank_bin}")
        if len(self.account_number) < 6:
            raise ValueError(f"Account number quá ngắn: {self.account_number}")
            
        # CRC16-CCITT-FALSE 
        self.crc16_func = crcmod.mkCrcFun(0x11021, initCrc=0xFFFF, rev=False, xorOut=0x0000)

    def format_field(self, tag, value):
        """Format EMV field: tag(2) + length(2) + value"""
        if not value:
            return ""
        value_str = str(value).strip()
        length_str = str(len(value_str)).zfill(2)
        return f"{tag}{length_str}{value_str}"

    def calculate_crc16(self, data):
        """Tính CRC16 cho EMVCo"""
        crc = self.crc16_func(data.encode('utf-8'))
        return f"{crc:04X}"

    def normalize_text(self, text):
        """Chuẩn hóa tiếng Việt thành ASCII"""
        if not text:
            return ""
            
        # Bảng chuyển đổi tiếng Việt
        mapping = {
            'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
            'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
            'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
            'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
            'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
            'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
            'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
            'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
            'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
            'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
            'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
            'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
            'đ': 'd', 'Đ': 'D'}
        
        # Thêm chữ hoa
        for k, v in list(mapping.items()):
            mapping[k.upper()] = v.upper()
        
        result = ""
        for char in text:
            if char in mapping:
                result += mapping[char]
            elif char.isascii() and (char.isalnum() or char == ' '):
                result += char.upper()
        
        return " ".join(result.split())  # Loại bỏ khoảng trắng thừa

    def create_merchant_account_info(self):
        """Tạo Merchant Account Information (tag 38) theo chuẩn VietQR"""
        # 00: GUID - NAPAS identifier
        field_00 = self.format_field("00", "A000000727")
        
        # 01: Beneficiary Organization (nested)
        sub_00 = self.format_field("00", self.bank_bin)  # Acquirer BIN
        sub_01 = self.format_field("01", self.account_number)  # Merchant/Account ID
        beneficiary_content = sub_00 + sub_01
        field_01 = self.format_field("01", beneficiary_content)
        
        # 02: Service Code - QRIBFTTA for account transfer
        field_02 = self.format_field("02", "QRIBFTTA")
        
        # Ghép lại
        mai_content = field_00 + field_01 + field_02
        
        return self.format_field("38", mai_content)

    def generate_payload(self, amount=0, message=""):
        """Tạo EMVCo QR payload chuẩn VietQR"""
        payload = ""
        
        # 00: Payload Format Indicator
        payload += self.format_field("00", "01")
        
        # 01: Point of Initiation Method
        payload += self.format_field("01", "12" if amount > 0 else "11")
        
        # 38: Merchant Account Information
        payload += self.create_merchant_account_info()
        
        # 52: Merchant Category Code
        payload += self.format_field("52", "0000")
        
        # 53: Transaction Currency (VND)
        payload += self.format_field("53", "704")
        
        # 54: Transaction Amount (chỉ khi amount > 0)
        if amount > 0:
            # Format amount: integer thì không có decimal, float thì có
            if amount == int(amount):
                amount_str = str(int(amount))
            else:
                amount_str = f"{amount:.2f}".rstrip('0').rstrip('.')
            payload += self.format_field("54", amount_str)
        
        # 58: Country Code
        payload += self.format_field("58", "VN")
        
        # 59: Merchant Name (tối đa 25 ký tự)
        name = self.normalize_text(self.account_name)[:25].strip()
        if not name:
            name = "MERCHANT"
        payload += self.format_field("59", name)
        
        # 60: Merchant City (tối đa 15 ký tự)  
        payload += self.format_field("60", "HO CHI MINH")
        
        # 62: Additional Data (chỉ khi có message)
        if message and message.strip():
            normalized_msg = self.normalize_text(message.strip())[:25].strip()
            if normalized_msg:
                # 08: Bill Number
                add_data = self.format_field("08", normalized_msg)
                payload += self.format_field("62", add_data)
        
        # 63: CRC
        crc_input = payload + "6304"
        crc = self.calculate_crc16(crc_input)
        payload += f"6304{crc}"
        
        return payload

    def generate_qr_code(self, payload):
        """Tạo QR code từ payload"""
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4
        )
        qr.add_data(payload)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_base64}"

    def parse_payload(self, payload):
        """Parse payload để debug"""
        result = {}
        i = 0
        
        while i < len(payload) - 4:
            if i + 4 > len(payload):
                break
                
            tag = payload[i:i+2]
            try:
                length = int(payload[i+2:i+4])
            except:
                break
                
            if i + 4 + length > len(payload):
                break
                
            value = payload[i+4:i+4+length]
            result[tag] = {'length': length, 'value': value}
            
            # Parse tag 38 (Merchant Account Info)
            if tag == '38':
                sub_result = {}
                j = 0
                while j < len(value):
                    if j + 4 > len(value):
                        break
                    sub_tag = value[j:j+2] 
                    try:
                        sub_length = int(value[j+2:j+4])
                    except:
                        break
                    if j + 4 + sub_length > len(value):
                        break
                    sub_value = value[j+4:j+4+sub_length]
                    sub_result[sub_tag] = sub_value
                    j += 4 + sub_length
                result[tag]['parsed'] = sub_result
            
            i += 4 + length
            
        return result

# Khởi tạo generator với thông tin thực tế
generator = VietQRGenerator(
    bank_bin=os.getenv('BANK_BIN'),  
    account_number=os.getenv('ACCOUNT_NUMBER'),
    account_name=os.getenv('ACCOUNT_NAME')
)

@app.route('/')
def index():
    """ Trang chính"""
    bank_info = {
        'bank_name': 'Techcombank',
        'account_name': generator.account_name,
        'account_number': generator.account_number,
        'bank_bin': generator.bank_bin
    }
    return render_template('index.html', bank_info=bank_info)

@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    """API tạo QR code"""
    try:
        data = request.get_json()
        
        # Parse amount
        amount = data.get('amount', 0)
        if isinstance(amount, str):
            amount = float(amount.replace(',', '')) if amount else 0
        amount = float(amount) if amount else 0
        
        message = data.get('message', '').strip()
        
        # Validate
        if amount < 0:
            return jsonify({'success': False, 'error': 'Số tiền không được âm'})
            
        # Generate payload
        payload = generator.generate_payload(amount, message)
        
        # Validate payload length  
        if len(payload) > 512:
            return jsonify({'success': False, 'error': 'Payload quá dài'})
            
        # Generate QR image
        qr_image = generator.generate_qr_code(payload)
        
        # Format display amount
        if amount > 0:
            display_amount = f"{int(amount):,}" if amount == int(amount) else f"{amount:,.2f}"
        else:
            display_amount = "Không xác định"
            
        return jsonify({
            'success': True,
            'qr_image': qr_image,
            'payload': payload,
            'amount': display_amount,
            'message': message,
            'debug_info': {
                'payload_length': len(payload),
                'parsed': generator.parse_payload(payload),
                'bank_info': {
                    'bin': generator.bank_bin,
                    'account': generator.account_number,
                    'name': generator.account_name
                }
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Lỗi: {str(e)}'})

# Thêm endpoint mới để check transaction status (nếu integrate API VietQR.io)
# Ví dụ: Đăng ký tại https://vietqr.vn, lấy username/password, rồi implement như sau:
# @app.route('/check_transaction', methods=['POST'])
# def check_transaction():
#     data = request.get_json()
#     transaction_id = data.get('transaction_id')
#     # Gọi API Transaction Sync từ VietQR API
#     # Ví dụ: requests.post('https://api.vietqr.vn/v2/transaction-sync', headers={'Authorization': 'Bearer YOUR_TOKEN'}, json={'transaction_id': transaction_id})
#     # Nếu status == 'success', return {'success': True, 'message': 'Đã thanh toán thành công'}
#     return jsonify({'success': False, 'error': 'Chưa integrate API'})

@app.route('/debug/<int:amount>/<path:message>')
def debug_payload(amount=1, message=""):
    """Debug payload chi tiết"""
    try:
        payload = generator.generate_payload(amount, message)
        parsed = generator.parse_payload(payload)
        
        return jsonify({
            'input': {'amount': amount, 'message': message},
            'payload': payload,
            'length': len(payload), 
            'parsed': parsed,
            'validation': {
                'format_ok': payload.startswith('000201'),
                'length_ok': 50 <= len(payload) <= 512,
                'has_merchant_info': '38' in parsed,
                'has_bank_bin': generator.bank_bin in payload,
                'has_account': generator.account_number in payload
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/quick_test')  
def quick_test():
    """Test nhanh với các trường hợp phổ biến"""
    test_cases = [
        {'amount': 0, 'message': ''},
        {'amount': 1, 'message': 'Test'},
        {'amount': 10000, 'message': 'Thanh toan'},
        {'amount': 50000.50, 'message': ''}
    ]
    
    results = []
    for case in test_cases:
        try:
            payload = generator.generate_payload(case['amount'], case['message'])
            results.append({
                'input': case,
                'payload': payload,
                'length': len(payload),
                'success': True
            })
        except Exception as e:
            results.append({
                'input': case,
                'error': str(e),
                'success': False
            })
    
    return jsonify({
        'generator_info': {
            'bank_bin': generator.bank_bin,
            'account_number': generator.account_number,  
            'account_name': generator.account_name
        },
        'test_results': results
    })

if __name__ == '__main__':
    print(f"VietQR Generator khởi tạo:")
    print(f"- Bank BIN: {generator.bank_bin}")
    print(f"- Account: {generator.account_number}")
    print(f"- Name: {generator.account_name}")
    
    host = os.getenv('HOST')
    port = int(os.getenv('PORT'))
    debug = os.getenv('FLASK_DEBUG').lower() == 'true'
    app.run(host=host, port=port, debug=debug)