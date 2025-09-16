import React, { useState } from "react";
import { apiService } from "../services/api";
import type { TransactionStatus } from "../types";

const TransactionStatusCheck: React.FC = () => {
  const [customOrderId, setCustomOrderId] = useState("");
  const [transactionStatus, setTransactionStatus] =
    useState<TransactionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check transaction status
  const checkTransactionStatus = async () => {
    if (!customOrderId.trim()) {
      setError("Please enter a custom order ID");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiService.getTransactionStatus(customOrderId);
      setTransactionStatus(response);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch transaction status",
      );
      setTransactionStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkTransactionStatus();
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getStatusConfig = (status: string) => {
      switch (status.toLowerCase()) {
        case "success":
          return {
            color: "bg-green-100 text-green-800 border-green-200",
            icon: "✅",
            label: "Success",
          };
        case "pending":
          return {
            color: "bg-yellow-100 text-yellow-800 border-yellow-200",
            icon: "⏳",
            label: "Pending",
          };
        case "failed":
          return {
            color: "bg-red-100 text-red-800 border-red-200",
            icon: "❌",
            label: "Failed",
          };
        default:
          return {
            color: "bg-gray-100 text-gray-800 border-gray-200",
            icon: "📄",
            label: status,
          };
      }
    };

    const config = getStatusConfig(status);

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}
      >
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN");
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            Transaction Status Check
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Enter a custom order ID to check the current status of a specific
            transaction.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="customOrderId"
              className="block text-sm font-medium text-gray-700"
            >
              Custom Order ID
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="customOrderId"
                placeholder="Enter custom order ID (e.g., ORD_1234567890_abc123)"
                value={customOrderId}
                onChange={(e) => setCustomOrderId(e.target.value)}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-primary-600 text-white text-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Checking...
                  </>
                ) : (
                  <>🔍 Check Status</>
                )}
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="text-sm text-gray-500">
            <p>Examples of custom order IDs:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  ORD_1234567890_abc123
                </code>
              </li>
              <li>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  ORD_9876543210_xyz789
                </code>
              </li>
            </ul>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
          <span className="mr-2">⚠️</span>
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600">
            Checking transaction status...
          </p>
        </div>
      )}

      {/* Transaction Status Results */}
      {transactionStatus && !loading && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <span className="mr-2">📊</span>
              Transaction Details
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Complete information for order:{" "}
              {transactionStatus.custom_order_id}
            </p>
          </div>

          <div className="border-t border-gray-200">
            <dl>
              {/* Status */}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  <StatusBadge status={transactionStatus.status} />
                </dd>
              </div>

              {/* Order Information */}
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Custom Order ID
                </dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 sm:col-span-2">
                  {transactionStatus.custom_order_id}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Collect ID
                </dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 sm:col-span-2">
                  {transactionStatus.collect_id}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">School ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  {transactionStatus.school_id}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Gateway</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  {transactionStatus.gateway}
                </dd>
              </div>

              {/* Student Information */}
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Student Information
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  <div className="space-y-1">
                    <div>
                      <strong>Name:</strong>{" "}
                      {transactionStatus.student_info.name}
                    </div>
                    <div>
                      <strong>ID:</strong> {transactionStatus.student_info.id}
                    </div>
                    <div>
                      <strong>Email:</strong>{" "}
                      {transactionStatus.student_info.email}
                    </div>
                  </div>
                </dd>
              </div>

              {/* Payment Information */}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Order Amount
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  <span className="text-lg font-semibold">
                    {formatCurrency(transactionStatus.order_amount)}
                  </span>
                </dd>
              </div>

              {transactionStatus.transaction_amount && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Transaction Amount
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                    <span className="text-lg font-semibold">
                      {formatCurrency(transactionStatus.transaction_amount)}
                    </span>
                  </dd>
                </div>
              )}

              {transactionStatus.payment_mode && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Payment Mode
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                    {transactionStatus.payment_mode}
                  </dd>
                </div>
              )}

              {transactionStatus.bank_reference && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Bank Reference
                  </dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 sm:col-span-2">
                    {transactionStatus.bank_reference}
                  </dd>
                </div>
              )}

              {/* Messages */}
              {transactionStatus.payment_message && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Payment Message
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      {transactionStatus.payment_message}
                    </span>
                  </dd>
                </div>
              )}

              {transactionStatus.error_message && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Error Message
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                      {transactionStatus.error_message}
                    </span>
                  </dd>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Created At
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  {formatDate(transactionStatus.createdAt)}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  {formatDate(transactionStatus.updatedAt)}
                </dd>
              </div>

              {transactionStatus.payment_time && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">
                    Payment Time
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                    {formatDate(transactionStatus.payment_time)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setTransactionStatus(null);
                setCustomOrderId("");
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Clear
            </button>
            <button
              onClick={checkTransactionStatus}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!transactionStatus && !loading && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Check Transaction Status
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Enter a custom order ID in the search box above to view detailed
            information about a specific transaction.
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionStatusCheck;
