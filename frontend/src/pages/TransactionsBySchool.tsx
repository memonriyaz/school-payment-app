import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";
import type { Transaction, TransactionsResponse } from "../types";

const TransactionsBySchool: React.FC = () => {
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Predefined school IDs (in real app, this would come from API)
  const commonSchoolIds = [
    "65b0e6293e9f76a9694d84b4",
    "school123",
    "school456",
    "school789",
  ];

  // Fetch transactions for selected school
  const fetchTransactionsBySchool = async () => {
    if (!selectedSchoolId.trim()) {
      setTransactions([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
      });
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response: TransactionsResponse =
        await apiService.getTransactionsBySchool(selectedSchoolId, {
          page,
          limit,
        });

      setTransactions(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch transactions");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load transactions when school ID or page changes
  useEffect(() => {
    fetchTransactionsBySchool();
  }, [selectedSchoolId, page]);

  // Reset page when school changes
  const handleSchoolChange = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setPage(1);
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case "success":
          return "bg-green-100 text-green-800";
        case "pending":
          return "bg-yellow-100 text-yellow-800";
        case "failed":
          return "bg-red-100 text-red-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}
      >
        {status}
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
            Transactions by School
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            View all transactions for a specific school by entering or selecting
            a school ID.
          </p>
        </div>
      </div>

      {/* School Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Select School
        </h3>

        <div className="space-y-4">
          {/* Manual Input */}
          <div>
            <label
              htmlFor="schoolId"
              className="block text-sm font-medium text-gray-700"
            >
              School ID
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                id="schoolId"
                placeholder="Enter school ID (e.g., 65b0e6293e9f76a9694d84b4)"
                value={selectedSchoolId}
                onChange={(e) => handleSchoolChange(e.target.value)}
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              <button
                onClick={fetchTransactionsBySchool}
                className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              >
                🔍 Search
              </button>
            </div>
          </div>

          {/* Quick Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or select from common school IDs:
            </label>
            <div className="flex flex-wrap gap-2">
              {commonSchoolIds.map((schoolId) => (
                <button
                  key={schoolId}
                  onClick={() => handleSchoolChange(schoolId)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    selectedSchoolId === schoolId
                      ? "bg-primary-100 text-primary-800 border-primary-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                  } border`}
                >
                  {schoolId}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading transactions...</p>
        </div>
      )}

      {/* Results */}
      {!loading && selectedSchoolId && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Transactions for School: {selectedSchoolId}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {transactions.length > 0 ? (
                <>
                  {pagination.totalCount} total transactions found
                  {pagination.totalPages > 1 &&
                    ` (Page ${pagination.currentPage} of ${pagination.totalPages})`}
                </>
              ) : (
                "No transactions found for this school"
              )}
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-lg">No transactions found</p>
              <p className="text-gray-400 text-sm mt-2">
                Try a different school ID or check if the school has any
                transactions.
              </p>
            </div>
          ) : (
            <>
              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Collect ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gateway
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Custom Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.collect_id}
                        className="hover:bg-gray-50 transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {transaction.collect_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.gateway}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(transaction.order_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.transaction_amount
                            ? formatCurrency(transaction.transaction_amount)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={transaction.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {transaction.custom_order_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {transaction.student_name}
                            </div>
                            <div className="text-gray-500">
                              {transaction.student_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNextPage}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">
                          {(pagination.currentPage - 1) * limit + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">
                          {Math.min(
                            pagination.currentPage * limit,
                            pagination.totalCount,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-medium">
                          {pagination.totalCount}
                        </span>{" "}
                        results
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() => setPage(page - 1)}
                          disabled={!pagination.hasPrevPage}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage(page + 1)}
                          disabled={!pagination.hasNextPage}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Help Text */}
      {!selectedSchoolId && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏫</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a School
          </h3>
          <p className="text-gray-500">
            Enter a school ID above or select from the common school IDs to view
            transactions.
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionsBySchool;
