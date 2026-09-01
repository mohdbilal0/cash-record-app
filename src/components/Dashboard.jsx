import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { 
  collection, addDoc, query, where, onSnapshot, doc, deleteDoc, serverTimestamp 
} from "firebase/firestore";
import Papa from "papaparse";
import { LogOut, Plus, Trash2, Download, Search, Wallet, UserPlus, Menu, X } from "lucide-react";

export default function Dashboard({ user }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [memberSearch, setMemberSearch] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [members, setMembers] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [selectedMember, setSelectedMember] = useState("");

  const username = user.email.split("@")[0];

  useEffect(() => {
    const q = query(collection(db, "projects"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projs);
      if (projs.length > 0 && !selectedProject) setSelectedProject(projs[0]);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (!selectedProject) return;
    const q = query(collection(db, "transactions"), where("projectId", "==", selectedProject.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
      const uniqueMembers = [...new Set(txs.map(t => t.memberName).filter(Boolean))];
      setMembers(uniqueMembers);
    });
    return () => unsubscribe();
  }, [selectedProject]);

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await addDoc(collection(db, "projects"), {
      name: newProjectName,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    setNewProjectName("");
  };

  const handleTransaction = async (type) => {
    if (!amount || Number(amount) <= 0) return;
    if (type === "out" && !selectedMember) {
      alert("Please select a member for withdrawal.");
      return;
    }

    await addDoc(collection(db, "transactions"), {
      projectId: selectedProject.id,
      type,
      method,
      amount: parseFloat(amount),
      memberName: type === "out" ? selectedMember : null,
      createdAt: new Date().toISOString()
    });

    setAmount("");
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (newMemberName && !members.includes(newMemberName)) {
      setMembers([...members, newMemberName]);
      setSelectedMember(newMemberName);
      setNewMemberName("");
    }
  };

  const exportCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const onlineIn = transactions.filter(t => t.type === "in" && t.method === "online").reduce((sum, t) => sum + t.amount, 0);
  const cashIn = transactions.filter(t => t.type === "in" && t.method === "cash").reduce((sum, t) => sum + t.amount, 0);
  const onlineOut = transactions.filter(t => t.type === "out" && t.method === "online").reduce((sum, t) => sum + t.amount, 0);
  const cashOut = transactions.filter(t => t.type === "out" && t.method === "cash").reduce((sum, t) => sum + t.amount, 0);

  const remainingOnline = onlineIn - onlineOut;
  const remainingCash = cashIn - cashOut;
  const totalRemaining = remainingOnline + remainingCash;
  const totalOut = onlineOut + cashOut;

  const filteredMembers = members.filter(m => m.toLowerCase().includes(memberSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-12">
      {/* Top Mobile-Responsive Navigation Bar */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="text-blue-600" size={24} />
            <span className="font-bold text-lg md:text-xl tracking-tight">CashRecord</span>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">User: <strong>{username}</strong></span>
            <button 
              onClick={() => auth.signOut()} 
              className="flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b px-4 py-3 space-y-3">
            <div className="text-sm text-gray-600">Logged in as: <strong>{username}</strong></div>
            <button 
              onClick={() => auth.signOut()} 
              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg font-semibold"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        
        {/* Project Selector & Add Project Section */}
        <section className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <form onSubmit={createProject} className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder="New Project Name"
              className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-1 hover:bg-blue-700 active:scale-95 transition">
              <Plus size={20} /> <span className="hidden sm:inline">Add Project</span>
            </button>
          </form>

          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold whitespace-nowrap">Active Project:</label>
              <select 
                className="w-full md:w-auto border border-gray-300 p-2 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={selectedProject?.id || ""}
                onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value))}
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </section>

        {selectedProject ? (
          <>
            {/* Project Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
              <div className="flex w-full sm:w-auto gap-2">
                <button 
                  onClick={() => exportCSV(transactions, `${selectedProject.name}_Transactions`)}
                  className="flex-1 sm:flex-initial bg-gray-800 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm font-medium hover:bg-black transition"
                >
                  <Download size={16} /> Export
                </button>
                <button 
                  onClick={async () => {
                    if (confirm("Delete this project?")) {
                      await deleteDoc(doc(db, "projects", selectedProject.id));
                      setSelectedProject(null);
                    }
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-sm font-medium transition"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>

            {/* Top Balance Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-blue-50 border border-blue-200 p-4 sm:p-5 rounded-xl">
                <h3 className="text-xs sm:text-sm font-semibold text-blue-800 uppercase tracking-wide">Total Remaining</h3>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-900 mt-1">${totalRemaining.toFixed(2)}</p>
                <div className="text-xs text-blue-700 mt-2 font-medium">
                  Online: ${remainingOnline.toFixed(2)} | Cash: ${remainingCash.toFixed(2)}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 sm:p-5 rounded-xl">
                <h3 className="text-xs sm:text-sm font-semibold text-emerald-800 uppercase tracking-wide">Physical In-Cash</h3>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">${remainingCash.toFixed(2)}</p>
                <div className="text-xs text-emerald-700 mt-2 font-medium">
                  In: ${cashIn.toFixed(2)} | Out: ${cashOut.toFixed(2)}
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-4 sm:p-5 rounded-xl">
                <h3 className="text-xs sm:text-sm font-semibold text-rose-800 uppercase tracking-wide">Total Out-Cash</h3>
                <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 mt-1">${totalOut.toFixed(2)}</p>
                <div className="text-xs text-rose-700 mt-2 font-medium">
                  Online: ${onlineOut.toFixed(2)} | Physical: ${cashOut.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Action Area: Add & Withdraw Cash */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-900">1. Transaction Controls</h3>
                
                <input 
                  type="number" 
                  placeholder="Amount ($)" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
                
                <div className="flex gap-6 py-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                    <input 
                      type="radio" 
                      value="cash" 
                      checked={method === "cash"} 
                      onChange={() => setMethod("cash")}
                      className="w-4 h-4 text-blue-600" 
                    /> Physical Cash
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                    <input 
                      type="radio" 
                      value="online" 
                      checked={method === "online"} 
                      onChange={() => setMethod("online")}
                      className="w-4 h-4 text-blue-600" 
                    /> Online Transfer
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => handleTransaction("in")} 
                    className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 active:scale-95 transition"
                  >
                    + Add Cash
                  </button>
                  <button 
                    onClick={() => handleTransaction("out")} 
                    className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold hover:bg-rose-700 active:scale-95 transition"
                  >
                    - Withdraw Cash
                  </button>
                </div>
              </div>

              {/* Member Search & Selection */}
              <div className="space-y-3">
                <h3 className="font-bold text-lg text-gray-900">2. Select Member (Withdrawals)</h3>
                
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search member..." 
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full border border-gray-300 pl-10 p-3 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <select 
                  className="w-full border border-gray-300 p-3 rounded-lg text-base bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={selectedMember} 
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  <option value="">-- Choose Member --</option>
                  {filteredMembers.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile-Responsive Transactions Table */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-gray-900">Recent Transactions</h3>
              
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold border-b">
                      <th className="p-3">Type</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Member</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-gray-400">No transactions recorded yet.</td>
                      </tr>
                    ) : (
                      transactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition">
                          <td className={`p-3 font-bold ${t.type === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                            {t.type === "in" ? "IN" : "OUT"}
                          </td>
                          <td className="p-3 capitalize font-medium">{t.method}</td>
                          <td className="p-3 font-semibold text-gray-900">${t.amount.toFixed(2)}</td>
                          <td className="p-3 text-gray-700">{t.memberName || "-"}</td>
                          <td className="p-3 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Member Management Cards */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-gray-900">Manage Project Members</h3>
              
              <form onSubmit={handleAddMember} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="New Member Name" 
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1 hover:bg-blue-700 transition whitespace-nowrap">
                  <UserPlus size={18} /> Add
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-2">
                {members.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 border bg-gray-50 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700">
                    <span>{m}</span>
                    <button 
                      title="Export Member Logs"
                      onClick={() => {
                        const memberTxs = transactions.filter(t => t.memberName === m);
                        exportCSV(memberTxs, `${m}_Transactions`);
                      }}
                      className="text-gray-400 hover:text-gray-800"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed">
            <p className="text-gray-500">No project selected. Create or select a project above to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}