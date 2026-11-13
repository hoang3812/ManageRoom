/**
 * utils/code-generator.ts
 * Tạo các mã code tự động cho hợp đồng, hóa đơn, thanh toán, bảo trì
 * Format: PREFIX-YYYYMMDD-XXXXX (ví dụ: HD-20240115-00001)
 */

/**
 * Tạo mã với prefix, ngày hiện tại và số thứ tự
 * @param prefix - Tiền tố (HD, INV, PAY, MNT)
 * @param sequence - Số thứ tự (sẽ được padding thành 5 chữ số)
 */
const generateCode = (prefix: string, sequence: number): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(5, '0');
  return `${prefix}-${year}${month}${day}-${seq}`;
};

/**
 * Tạo mã hợp đồng tự động
 * @param sequence - Số thứ tự của hợp đồng hôm nay
 */
export const generateContractCode = (sequence: number): string => {
  return generateCode('HD', sequence);
};

/**
 * Tạo mã hóa đơn tự động
 */
export const generateInvoiceCode = (sequence: number): string => {
  return generateCode('INV', sequence);
};

/**
 * Tạo mã thanh toán tự động
 */
export const generatePaymentCode = (sequence: number): string => {
  return generateCode('PAY', sequence);
};

/**
 * Tạo mã yêu cầu bảo trì tự động
 */
export const generateMaintenanceCode = (sequence: number): string => {
  return generateCode('MNT', sequence);
};

/**
 * Lấy số thứ tự tiếp theo từ database dựa trên ngày hiện tại
 * Đếm số bản ghi đã tạo hôm nay và cộng thêm 1
 * @param count - Số lượng bản ghi đã tạo hôm nay
 */
export const getNextSequence = (count: number): number => count + 1;
