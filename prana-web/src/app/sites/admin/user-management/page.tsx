"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import { toast } from "sonner";
import {
  getAdminUsers,
  deactivateAdminUser,
  activateAdminUser,
  deleteAdminUser,
} from "@/actions/admin-user-management.actions";
import {
  Search,
  MoreVertical,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  Trash2,
  Eye,
} from "lucide-react";

// --- HELPER COMPONENTS ---
const PlanBadge = ({ plan }: { plan: any }) => {
  if (!plan)
    return (
      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
        Free
      </span>
    );

  if (plan.planType === "BUNDLE")
    return (
      <span className="bg-[#f4ebe1] text-[#715438] px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
        {plan.planType}
      </span>
    );
  if (plan.planType === "MARKETPLACE")
    return (
      <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
        {plan.planType}
      </span>
    );
  if (plan.planType === "PREDICT")
    return (
      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
        {plan.planType}
      </span>
    );

  return (
    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
      {plan.planType}
    </span>
  );
};

const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  if (isActive)
    return (
      <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded text-[11px] font-bold">
        Active
      </span>
    );
  return (
    <span className="bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded text-[11px] font-bold">
      Deactivated
    </span>
  );
};

// Helper for initials
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export default function UserManagementPage() {
  const router = useRouter();

  // --- STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState<
    "all" | "predict" | "marketplace" | "bundle" | "free"
  >("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // Triggered on Enter
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    totalPages: 1,
  });

  // Action Menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const tabs: {
    label: string;
    value: "all" | "predict" | "marketplace" | "bundle" | "free";
  }[] = [
    { label: "All Users", value: "all" },
    { label: "Predict Users", value: "predict" },
    { label: "Marketplace Users", value: "marketplace" },
    { label: "Bundle", value: "bundle" },
    { label: "Free Users", value: "free" },
  ];

  // --- FETCH DATA ---
  const fetchUsers = async () => {
    setIsLoading(true);
    setOpenMenuId(null); // Close menus on refresh
    try {
      const res: any = await getAdminUsers({
        tab: activeTab === "free" ? "all" : activeTab,
        search: searchQuery || undefined,
        page,
        limit: 10,
      });
      if (res?.success && res?.data) {
        const filteredUsers =
          activeTab === "free"
            ? res.data.users.filter((u: any) => !u.activePlan)
            : res.data.users;
        setUsers(filteredUsers);
        setPagination({
          total: res.data.pagination.total,
          limit: res.data.pagination.limit,
          totalPages: res.data.pagination.totalPages,
        });
      }
    } catch (err) {
      toast.error("Failed to load user data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab, searchQuery, page]);

  // --- EVENT HANDLERS ---
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPage(1);
      setSearchQuery(searchInput);
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    const toastId = toast.loading(
      isActive ? "Deactivating user..." : "Activating user...",
    );
    try {
      const res: any = isActive
        ? await deactivateAdminUser(id)
        : await activateAdminUser(id);
      if (res?.success) {
        toast.success(res.message, { id: toastId });
        fetchUsers(); // Refresh data
      } else {
        toast.error(res?.message || "Action failed.", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred.", { id: toastId });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // if (
    //   !confirm(
    //     `Are you sure you want to delete ${name}? This cannot be undone.`,
    //   )
    // )
    //   return;

    const toastId = toast.loading("Deleting user...");
    try {
      const res: any = await deleteAdminUser(id);
      if (res?.success) {
        toast.success(res.message, { id: toastId });
        fetchUsers();
      } else {
        toast.error(res?.message || "Failed to delete user.", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred.", { id: toastId });
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <main
          className="flex-1 overflow-y-auto p-6 md:p-8"
          onClick={() => setOpenMenuId(null)}
        >
          <div className="max-w-[1400px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  User Management
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage platform users, permissions, and subscriptions.
                </p>
              </div>
              <div className="relative w-full md:w-[320px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setSearchQuery(e.target.value); // Updates query instantly
                    setPage(1); // Resets to page 1 on search
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1a82c4] transition-colors"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200 mb-6 no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setActiveTab(tab.value);
                    setPage(1);
                  }}
                  className={`px-6 py-2.5 text-sm font-bold transition-colors border-b-2 ${
                    activeTab === tab.value
                      ? "border-[#16a34a] text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-visible flex flex-col h-fit min-h-[400px]">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] text-gray-500 font-bold uppercase tracking-wider bg-[#f8faf9] border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4">USER</th>
                      <th className="px-6 py-4">ORGANIZATION</th>
                      <th className="px-6 py-4">PLAN</th>
                      <th className="px-6 py-4">LAST LOGIN</th>
                      <th className="px-6 py-4">STATUS</th>
                      <th className="px-6 py-4 text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-gray-400 font-medium"
                        >
                          Loading user data...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-12 text-center text-gray-400 font-medium"
                        >
                          No users found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs bg-blue-100 text-blue-700">
                                {user.avatarUrl ? (
                                  <Image
                                    src={user.avatarUrl}
                                    alt={user.fullName}
                                    width={36}
                                    height={36}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  getInitials(user.fullName)
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">
                                  {user.fullName}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-medium">
                            {user.organization?.name || "--"}
                          </td>
                          <td className="px-6 py-4">
                            <PlanBadge plan={user.activePlan} />
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge isActive={user.isActive} />
                          </td>
                          <td className="px-6 py-4 text-center relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(
                                  openMenuId === user.id ? null : user.id,
                                );
                              }}
                              className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {/* Dropdown Action Menu */}
                            {openMenuId === user.id && (
                              <div className="absolute right-8 top-10 w-40 bg-white border border-gray-100 shadow-lg rounded-lg py-1 z-50">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStatus(user.id, user.isActive);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  {user.isActive ? (
                                    <Lock
                                      size={14}
                                      className="text-amber-600"
                                    />
                                  ) : (
                                    <Unlock
                                      size={14}
                                      className="text-emerald-600"
                                    />
                                  )}
                                  {user.isActive ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUserToDelete({
                                      id: user.id,
                                      name: user.fullName,
                                    });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Delete User
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-gray-200 bg-[#f8faf9] px-6 py-4 flex items-center justify-between mt-auto">
                <span className="text-xs text-gray-500 font-medium">
                  Showing{" "}
                  {users.length > 0 ? (page - 1) * pagination.limit + 1 : 0} to{" "}
                  {Math.min(page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} results
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-[#1a82c4] bg-[#1a82c4] rounded text-white text-sm font-bold">
                    {page}
                  </button>
                  <button
                    disabled={page >= (pagination.totalPages || 1)}
                    onClick={() =>
                      setPage((p) =>
                        Math.min(pagination.totalPages || 1, p + 1),
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-100 p-6 mx-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
              <h3 className="text-[#1a82c4] font-bold text-lg flex items-center gap-2">
                ⚠ Delete User?
              </h3>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete {userToDelete.name}? This cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDelete(userToDelete.id, userToDelete.name);
                  setUserToDelete(null);
                }}
                className="px-5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-sm font-semibold shadow-sm transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
