import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import type {
  AuthResponse,
  TransactionsResponse,
  TransactionStatus,
} from "../types";

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );
  }

  // Auth methods
  async login(email: string, password: string): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post(
      "/auth/login",
      {
        email,
        password,
      },
    );
    return response.data;
  }

  async register(name: string, email: string, password: string): Promise<any> {
    const response = await this.api.post("/auth/register", {
      name,
      email,
      password,
    });
    return response.data;
  }

  // Transaction methods
  async getTransactions(
    params: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
      status?: string;
      school_id?: string;
      gateway?: string;
      _cacheBust?: boolean;
    } = {},
  ): Promise<TransactionsResponse> {
    // Add cache busting parameter if requested
    const requestParams: any = { ...params };
    if (requestParams._cacheBust) {
      delete requestParams._cacheBust;
      requestParams._t = Date.now().toString();
    }

    const response: AxiosResponse<TransactionsResponse> = await this.api.get(
      "/transactions",
      {
        params: requestParams,
      },
    );
    return response.data;
  }

  async getTransactionsBySchool(
    schoolId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<TransactionsResponse> {
    const response: AxiosResponse<TransactionsResponse> = await this.api.get(
      `/transactions/school/${schoolId}`,
      { params },
    );
    return response.data;
  }

  async getTransactionStatus(
    customOrderId: string,
  ): Promise<TransactionStatus> {
    const response: AxiosResponse<TransactionStatus> = await this.api.get(
      `/transaction-status/${customOrderId}`,
    );
    return response.data;
  }

  // Utility methods
  setAuthToken(token: string) {
    localStorage.setItem("access_token", token);
  }

  clearAuthToken() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem("access_token");
  }

  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }
}

export const apiService = new ApiService();
