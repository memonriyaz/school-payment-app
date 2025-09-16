import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

interface PaymentResult {
  collect_id?: string;
  status?: string;
  amount?: string;
  message?: string;
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentResult, setPaymentResult] = useState<PaymentResult>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get parameters from URL
    const collectId = searchParams.get("collect_id");
    const status = searchParams.get("status");
    const amount = searchParams.get("amount");

    // Set payment completion flag in localStorage for dashboard refresh
    if (status === "success" && collectId) {
      localStorage.setItem(
        "recent_payment_completion",
        JSON.stringify({
          collect_id: collectId,
          timestamp: Date.now(),
          status: status,
        }),
      );
    }

    setPaymentResult({
      collect_id: collectId || "",
      status: status || "",
      amount: amount || "",
      message:
        status === "success"
          ? "Payment completed successfully!"
          : "Payment status updated",
    });

    setLoading(false);
  }, [searchParams]);

  const handleGoHome = () => {
    navigate("/make-payment");
  };

  const handleViewTransactions = () => {
    // Set a specific flag for payment completion navigation
    navigate("/dashboard?payment_completed=true&reset_filters=true");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment result...</p>
        </div>
      </div>
    );
  }

  const isSuccess = paymentResult.status === "success";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-6">
              {isSuccess ? (
                <svg
                  className="h-12 w-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="h-12 w-12 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            {/* Title */}
            <h2
              className={`text-3xl font-extrabold ${isSuccess ? "text-green-900" : "text-blue-900"} mb-4`}
            >
              {isSuccess ? "Payment Successful!" : "Payment Status Updated"}
            </h2>

            {/* Message */}
            <p className="text-lg text-gray-700 mb-6">
              {paymentResult.message}
            </p>

            {/* Payment Details */}
            {paymentResult.collect_id && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Payment Details
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Collection ID:</span>
                    <span className="font-mono">
                      {paymentResult.collect_id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={`font-semibold ${isSuccess ? "text-green-600" : "text-blue-600"}`}
                    >
                      {paymentResult.status?.toUpperCase()}
                    </span>
                  </div>
                  {paymentResult.amount && (
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-semibold">
                        ₹{paymentResult.amount}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Payment Time:</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {isSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Your payment has been processed successfully. You should
                      receive a confirmation email shortly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleGoHome}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Make Another Payment
              </button>

              <button
                onClick={handleViewTransactions}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                View All Transactions
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Payment processed by EDVIRON Payment Gateway
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
