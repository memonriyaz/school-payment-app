export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Transaction {
  collect_id: string;
  school_id: string;
  gateway: string;
  order_amount: number;
  transaction_amount?: number;
  status: string; // Raw status from payment gateway
  status_category?: string; // Classified status: PENDING, SUCCESS, FAILED, CANCELLED
  original_status?: string; // Original status for debugging
  custom_order_id: string;
  payment_time?: string;
  payment_mode?: string;
  student_name?: string;
  student_email?: string;
  createdAt: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TransactionsResponse {
  data: Transaction[];
  pagination: PaginationInfo;
}

export interface TransactionStatus {
  custom_order_id: string;
  collect_id: string;
  school_id: string;
  student_info: {
    name: string;
    id: string;
    email: string;
  };
  gateway: string;
  order_amount: number;
  transaction_amount?: number;
  status: string;
  payment_mode?: string;
  payment_time?: string;
  payment_message?: string;
  error_message?: string;
  bank_reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
