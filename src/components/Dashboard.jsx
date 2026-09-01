import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { 
  collection, addDoc, query, where, onSnapshot, doc, deleteDoc, serverTimestamp 
} from "firebase/firestore";
import Papa from "papaparse";
import { 
  LogOut, Plus, Trash2, Download, Search, BookOpenCheck, UserPlus, Menu, X, 
  ArrowUpRight, ArrowDownLeft, AlertCircle, Users, FolderPlus, FileText
} from "lucide-react";

export default function Dashboard({ user }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [memberSearch, setMemberSearch] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [members, setMembers] = useState([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
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

  // Balance Calculations
  const onlineIn = transactions.filter(t => t.type === "in" && t.method === "online").reduce((sum, t) => sum + t.amount, 0);
  const cashIn = transactions.filter(t => t.type === "in" && t.method === "cash").reduce((sum, t) => sum + t.amount, 0);
  const onlineOut = transactions.filter(t => t.type === "out" && t.method === "online").reduce((sum, t) => sum + t.amount, 0);
  const cashOut = transactions.filter(t => t.type === "out" && t.method === "cash").reduce((sum, t) => sum + t.amount, 0);

  const remainingOnline = onlineIn - onlineOut;
  const remainingCash = cashIn - cashOut;
  const totalRemaining = remainingOnline + remainingCash;
  const totalOut = onlineOut + cashOut;

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
    setErrorMessage("");
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Please enter a valid positive amount.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Please provide a brief description for this transaction.");
      return;
    }

    if (type === "out") {
      if (!selectedMember) {
        setErrorMessage("Please select a member for withdrawal.");
        return;
      }

      // CONSTRAINT CHECK: Prevent over-withdrawing past available balance
      const currentAvailable = method === "cash" ? remainingCash : remainingOnline;
      if (numAmount > currentAvailable) {
        setErrorMessage(
          `Withdrawal failed! Requested amount ($${numAmount.toFixed(2)}) exceeds remaining ${method.toUpperCase()} balance ($${currentAvailable.toFixed(2)}).`
        );
        return;
      }
    }

    await addDoc(collection(db, "transactions"), {
      projectId: selectedProject.id,
      type,
      method,
      amount: numAmount,
      description: description.trim(),
      memberName: type === "out" ? selectedMember : null,
      createdAt: new Date().toISOString()
    });

    setAmount("");
    setDescription("");
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
    const csvData = data.map(t => ({
      Type: t.type === "in" ? "Income" : "Withdrawal",
      Method: t.method,
      Amount: t.amount,
      Description: t.description || "-",
      Member: t.memberName || "-",
      Date: new Date(t.createdAt).toLocaleDateString()
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const filteredMembers = members.filter(m => m.toLowerCase().includes(memberSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 font-sans pb-16">
      {/* Black Header Navbar */}
      <header className="bg-black text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white text-black rounded-xl shadow-sm">
              <BookOpenCheck size={20} />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block text-white">CashRecord</span>
              <span className="text-[10px] text-zinc-400 -mt-1 block font-mono">CASHBOOK LEDGER</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs text-zinc-400">User: <strong className="text-white capitalize">{username}</strong></span>
            <button 
              onClick={() => auth.signOut()} 
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:bg-zinc-800"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-zinc-900 border-t border-zinc-800 px-4 py-4 space-y-3">
            <div className="text-xs text-zinc-400">Signed in as: <strong className="text-white capitalize">{username}</strong></div>
            <button 
              onClick={() => auth.signOut()} 
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-white py-2 rounded-lg text-xs font-semibold"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Project Selector Bar */}
        <section className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <form onSubmit={createProject} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <FolderPlus size={18} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="New project name..."
                className="w-full border border-zinc-200 pl-10 pr-3 py-2 rounded-xl text-sm focus:ring-2 focus:ring-black focus:outline-none bg-zinc-50/50"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <button className="bg-black text-white px-5 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition">
              <Plus size={16} /> <span>Create</span>
            </button>
          </form>

          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Project:</label>
              <select 
                className="w-full md:w-auto border border-zinc-200 px-3 py-2 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-black focus:outline-none shadow-sm cursor-pointer"
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
            {/* Project Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Record</span>
                <h2 className="text-2xl font-black text-black tracking-tight">{selectedProject.name}</h2>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                <button 
                  onClick={() => exportCSV(transactions, `${selectedProject.name}_Transactions`)}
                  className="flex-1 sm:flex-initial bg-zinc-900 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold hover:bg-black transition"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button 
                  onClick={async () => {
                    if (confirm(`Delete ${selectedProject.name}?`)) {
                      await deleteDoc(doc(db, "projects", selectedProject.id));
                      setSelectedProject(null);
                    }
                  }}
                  className="bg-zinc-100 text-zinc-600 hover:bg-rose-50 hover:text-rose-600 border border-zinc-200 px-3 py-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <div className="flex-1 text-xs font-bold text-rose-900">{errorMessage}</div>
                <button onClick={() => setErrorMessage("")} className="text-rose-500 hover:text-rose-800 font-bold">✕</button>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-black text-white p-5 rounded-2xl shadow-md">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Net Balance</div>
                <p className="text-3xl font-black mt-2">${totalRemaining.toFixed(2)}</p>
                <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex justify-between font-mono">
                  <span>Cash: ${remainingCash.toFixed(2)}</span>
                  <span>Online: ${remainingOnline.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white border-2 border-emerald-500/20 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center text-emerald-600">
                  <span className="text-xs font-bold uppercase tracking-wider">Physical Cash</span>
                  <ArrowDownLeft size={18} />
                </div>
                <p className="text-3xl font-black text-black mt-2">${remainingCash.toFixed(2)}</p>
                <div className="mt-3 pt-3 border-t border-zinc-100 text-xs font-medium flex justify-between">
                  <span className="text-emerald-600 font-bold">In: +${cashIn.toFixed(2)}</span>
                  <span className="text-rose-600 font-bold">Out: -${cashOut.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white border-2 border-rose-500/20 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center text-rose-600">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Outgoing</span>
                  <ArrowUpRight size={18} />
                </div>
                <p className="text-3xl font-black text-black mt-2">${totalOut.toFixed(2)}</p>
                <div className="mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500 font-medium flex justify-between">
                  <span>Physical: ${cashOut.toFixed(2)}</span>
                  <span>Online: ${onlineOut.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Transaction Controls */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-black">Record Transaction</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Amount ($)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (errorMessage) setErrorMessage("");
                      }}
                      className="w-full border border-zinc-200 p-3 rounded-xl text-lg font-bold text-black focus:ring-2 focus:ring-black focus:outline-none bg-zinc-50/50" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Description / Note</label>
                    <div className="relative">
                      <FileText size={16} className="absolute left-3 top-3.5 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="e.g., Office rent, advance" 
                        value={description} 
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (errorMessage) setErrorMessage("");
                        }}
                        className="w-full border border-zinc-200 pl-9 p-3 rounded-xl text-sm font-semibold text-black focus:ring-2 focus:ring-black focus:outline-none bg-zinc-50/50" 
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMethod("cash")}
                      className={`py-2.5 rounded-xl font-bold text-xs border transition ${
                        method === "cash" 
                          ? "bg-black text-white border-black" 
                          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      Physical Cash (${remainingCash.toFixed(2)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("online")}
                      className={`py-2.5 rounded-xl font-bold text-xs border transition ${
                        method === "online" 
                          ? "bg-black text-white border-black" 
                          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      Online Transfer (${remainingOnline.toFixed(2)})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => handleTransaction("in")} 
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs tracking-wider uppercase hover:bg-emerald-700 active:scale-95 transition shadow-sm"
                  >
                    + Add Funds
                  </button>
                  <button 
                    onClick={() => handleTransaction("out")} 
                    className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold text-xs tracking-wider uppercase hover:bg-rose-700 active:scale-95 transition shadow-sm"
                  >
                    - Withdraw
                  </button>
                </div>
              </div>

              {/* Member Selection */}
              <div className="space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-black">Member Selection (Withdrawals)</h3>
                
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 text-zinc-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search member..." 
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full border border-zinc-200 pl-10 p-3 rounded-xl text-xs font-medium focus:ring-2 focus:ring-black focus:outline-none bg-zinc-50/50"
                  />
                </div>

                <select 
                  className="w-full border border-zinc-200 p-3 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-black focus:outline-none shadow-sm cursor-pointer"
                  value={selectedMember} 
                  onChange={(e) => setSelectedMember(e.target.value)}
                >
                  <option value="">-- Choose Recipient Member --</option>
                  {filteredMembers.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500 font-medium">
                  Constraint Check Active: Withdrawals cannot exceed available <strong>{method.toUpperCase()}</strong> balance.
                </div>
              </div>
            </div>

            {/* Transaction Log Table */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-wider text-black">Transaction Log</h3>
                <span className="text-xs bg-black text-white font-bold px-2.5 py-1 rounded-full">{transactions.length} Entries</span>
              </div>
              
              <div className="overflow-x-auto -mx-5 sm:mx-0">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-500 uppercase text-[10px] font-black tracking-wider border-b border-zinc-200">
                      <th className="p-3">Type</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Member</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs font-medium">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-zinc-400 font-bold">No transactions logged.</td>
                      </tr>
                    ) : (
                      transactions.map(t => (
                        <tr key={t.id} className="hover:bg-zinc-50 transition">
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              t.type === "in" 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-rose-100 text-rose-700"
                            }`}>
                              {t.type === "in" ? "+ INCOME" : "- OUTGOING"}
                            </span>
                          </td>
                          <td className="p-3 capitalize font-bold text-zinc-700">{t.method}</td>
                          <td className={`p-3 font-extrabold ${t.type === "in" ? "text-emerald-600" : "text-rose-600"}`}>
                            {t.type === "in" ? "+" : "-"}${t.amount.toFixed(2)}
                          </td>
                          <td className="p-3 text-zinc-800 font-medium">{t.description || "-"}</td>
                          <td className="p-3 text-zinc-800 font-semibold">{t.memberName || "-"}</td>
                          <td className="p-3 text-[10px] text-zinc-400 font-mono">{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Member Management */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-black" />
                <h3 className="font-black text-sm uppercase tracking-wider text-black">Project Members</h3>
              </div>
              
              <form onSubmit={handleAddMember} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="New member name..." 
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 border border-zinc-200 px-3 py-2 rounded-xl text-xs font-medium focus:ring-2 focus:ring-black focus:outline-none bg-zinc-50/50" 
                />
                <button className="bg-black text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1 hover:bg-zinc-800 transition">
                  <UserPlus size={14} /> Add Member
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-1">
                {members.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-1.5 rounded-full text-xs font-bold text-zinc-800">
                    <span>{m}</span>
                    <button 
                      title="Export Member Logs"
                      onClick={() => {
                        const memberTxs = transactions.filter(t => t.memberName === m);
                        exportCSV(memberTxs, `${m}_Transactions`);
                      }}
                      className="text-zinc-400 hover:text-black transition"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-zinc-300">
            <p className="text-zinc-400 font-medium text-xs">No active project selected. Create or select a project above.</p>
          </div>
        )}
      </main>
    </div>
  );
}