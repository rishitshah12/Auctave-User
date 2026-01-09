// Import necessary React hooks and types
import React, { useState, useEffect, FC } from 'react';
// Import the main layout component
import { MainLayout } from './MainLayout';
// Import services for CRM and User data
import { crmService } from './crm.service';
import { userService } from './user.service';
import { factoryService } from './factory.service';
// Import icons from lucide-react
import { Plus, Trash2, Edit, Save, X, FileText, CheckCircle, Clock, ChevronDown, ChevronRight, Info, List, LayoutDashboard, ClipboardCheck, PieChart as PieChartIcon, GanttChartSquare } from 'lucide-react';
import { DashboardView, ListView, BoardView, GanttChartView, TNAView, OrderDetailsView } from './CRMPage';

// Define props interface for the AdminCRMPage component
interface AdminCRMPageProps {
    pageKey: number;
    user: any;
    currentPage: string;
    isMenuOpen: boolean;
    isSidebarCollapsed: boolean;
    toggleMenu: () => void;
    setIsSidebarCollapsed: (isCollapsed: boolean) => void;
    handleSetCurrentPage: (page: string, data?: any) => void;
    handleSignOut: () => void;
    isAdmin: boolean;
    supabase: any;
}

// Define the AdminCRMPage component
export const AdminCRMPage: FC<AdminCRMPageProps> = ({ supabase, ...props }) => {
    // State to store the list of clients
    const [clients, setClients] = useState<any[]>([]);
    // State to store the currently selected client ID
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    // State to store the orders for the selected client
    const [orders, setOrders] = useState<any[]>([]);
    // State to manage loading status
    const [isLoading, setIsLoading] = useState(false);
    // State to manage the order currently being edited
    const [editingOrder, setEditingOrder] = useState<any>(null);
    // State to manage the visibility of the modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [factories, setFactories] = useState<any[]>([]);
    const [activeView, setActiveView] = useState('Details');
    const [activeOrderKey, setActiveOrderKey] = useState<string | null>(null);
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
    const [newOrderData, setNewOrderData] = useState({
        product_name: '',
        factory_id: '',
        status: 'Pending',
        tasks: [] as any[],
        documents: [] as any[]
    });

    // Helper function to show toast notifications
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (window.showToast) window.showToast(message, type);
    };

    // Fetch Clients on Mount
    useEffect(() => {
        const fetchClients = async () => {
            // Call getAll method from userService
            const { data, error } = await userService.getAll();
            // Handle error or set clients data
            if (error) showToast('Failed to fetch clients: ' + error.message, 'error');
            else setClients(data || []);
        };
        fetchClients();

        const fetchFactories = async () => {
            const { data } = await factoryService.getAll();
            setFactories(data || []);
        };
        fetchFactories();
    }, []);

    // Fetch Orders when Client Selected
    useEffect(() => {
        // If no client selected, clear orders
        if (!selectedClientId) {
            setOrders([]);
            setActiveOrderKey(null);
            return;
        }
        const fetchOrders = async () => {
            // Set loading to true
            setIsLoading(true);
            // Call getOrdersByClient method from crmService
            const { data, error } = await crmService.getOrdersByClient(selectedClientId);
            // Handle error or set orders data
            if (error) showToast('Failed to fetch orders: ' + error.message, 'error');
            else {
                setOrders(data || []);
                if (data && data.length > 0) {
                    setActiveOrderKey(data[0].id);
                } else {
                    setActiveOrderKey(null);
                }
            }
            // Set loading to false
            setIsLoading(false);
        };
        fetchOrders();
    }, [selectedClientId]);

    // Function to handle opening the edit modal for an order
    const handleEditOrder = (order: any) => {
        // Deep copy to avoid mutating state directly during edits
        setEditingOrder(JSON.parse(JSON.stringify(order)));
        setIsModalOpen(true);
    };

    // Function to save changes to an order
    const handleSaveOrder = async () => {
        if (!editingOrder) return;
        
        // Prepare updates object
        const updates = {
            status: editingOrder.status,
            tasks: editingOrder.tasks,
            documents: editingOrder.documents,
            updated_at: new Date().toISOString()
        };

        // Call update method from crmService
        const { error } = await crmService.update(editingOrder.id, updates);
        if (error) {
            showToast('Failed to update order: ' + error.message, 'error');
        } else {
            // On success, show toast, update local state, and close modal
            showToast('Order updated successfully');
            setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...updates } : o));
            setIsModalOpen(false);
        }
    };

    // --- Task Management Helpers ---
    // Function to update a specific task in the editing order
    const updateTask = (index: number, field: string, value: any) => {
        // Copy existing tasks
        const newTasks = [...(editingOrder.tasks || [])];
        // Update specific task field
        newTasks[index] = { ...newTasks[index], [field]: value };
        // Update state
        setEditingOrder({ ...editingOrder, tasks: newTasks });
    };

    // Function to add a new task
    const addTask = () => {
        const newTask = {
            id: Date.now(),
            name: 'New Task',
            status: 'TO DO',
            plannedEndDate: new Date().toISOString().split('T')[0]
        };
        // Add new task to state
        setEditingOrder({ ...editingOrder, tasks: [...(editingOrder.tasks || []), newTask] });
    };

    // Function to remove a task
    const removeTask = (index: number) => {
        // Copy existing tasks
        const newTasks = [...(editingOrder.tasks || [])];
        // Remove task at index
        newTasks.splice(index, 1);
        // Update state
        setEditingOrder({ ...editingOrder, tasks: newTasks });
    };

    // --- Document Management Helpers ---
    // Function to add a new document
    const addDocument = () => {
        const newDoc = {
            name: 'New Document',
            type: 'General',
            lastUpdated: new Date().toISOString().split('T')[0]
        };
        // Add new document to state
        setEditingOrder({ ...editingOrder, documents: [...(editingOrder.documents || []), newDoc] });
    };

    // Function to update a specific document
    const updateDocument = (index: number, field: string, value: any) => {
        // Copy existing documents
        const newDocs = [...(editingOrder.documents || [])];
        // Update specific document field
        newDocs[index] = { ...newDocs[index], [field]: value };
        // Update state
        setEditingOrder({ ...editingOrder, documents: newDocs });
    };

    // Function to remove a document
    const removeDocument = (index: number) => {
        // Copy existing documents
        const newDocs = [...(editingOrder.documents || [])];
        // Remove document at index
        newDocs.splice(index, 1);
        // Update state
        setEditingOrder({ ...editingOrder, documents: newDocs });
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrderData.product_name || !newOrderData.factory_id) {
            showToast('Please fill required fields', 'error');
            return;
        }
        
        const payload = {
            client_id: selectedClientId,
            product_name: newOrderData.product_name,
            factory_id: newOrderData.factory_id,
            status: newOrderData.status,
            tasks: [
                { id: Date.now(), name: 'Order Confirmation', status: 'TO DO', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date().toISOString().split('T')[0], responsible: 'Admin' },
                { id: Date.now() + 1, name: 'Fabric Sourcing', status: 'TO DO', plannedStartDate: new Date().toISOString().split('T')[0], plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], responsible: 'Merch Team' }
            ],
            documents: []
        };

        const { error } = await crmService.create(payload);
        if (error) {
             showToast(error.message, 'error');
        } else {
             showToast('Order created successfully');
             setIsCreateOrderOpen(false);
             setNewOrderData({ product_name: '', factory_id: '', status: 'Pending', tasks: [], documents: [] });
             // Refresh orders
             const { data } = await crmService.getOrdersByClient(selectedClientId);
             setOrders(data || []);
             if (data && data.length > 0) setActiveOrderKey(data[0].id);
        }
    };

    const activeOrder = orders.find(o => o.id === activeOrderKey);
    // Transform activeOrder to match CRMPage component expectations
    const transformedOrder = activeOrder ? {
        ...activeOrder,
        customer: clients.find(c => c.id === selectedClientId)?.name || 'Unknown Client',
        product: activeOrder.product_name,
        factoryId: activeOrder.factory_id,
        tasks: activeOrder.tasks || [],
        documents: activeOrder.documents || []
    } : null;

    return (
        // Render the MainLayout with props
        <MainLayout {...props}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">CRM Manager</h1>
                        <p className="text-gray-500 mt-1">Manage client orders, timelines, and documents.</p>
                    </div>
                </div>

                {/* Client Selector */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Client</label>
                    <select 
                        value={selectedClientId} 
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                        <option value="">-- Choose a Client --</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name} ({client.company_name})</option>
                        ))}
                    </select>
                </div>

                {/* Orders List */}
                {selectedClientId && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 p-6">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500">Loading orders...</div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-12">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Orders</h3>
                                <p className="text-gray-500 mb-6">This client has no active orders yet.</p>
                                <button 
                                    onClick={() => setIsCreateOrderOpen(true)}
                                    className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-md flex items-center gap-2 mx-auto"
                                >
                                    <Plus size={20} /> Start New Order
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="border-b border-gray-200 pb-4 mb-6">
                                    <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2">
                                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                                            {orders.map(order => (
                                                <button key={order.id} onClick={() => setActiveOrderKey(order.id)} className={`flex-shrink-0 py-2 px-4 font-semibold text-sm rounded-t-lg transition-colors ${activeOrderKey === order.id ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                                    {order.product_name}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-gray-50">
                                                {[
                                                    {name: 'Details', icon: <Info size={16}/>},
                                                    {name: 'List', icon: <List size={16}/>},
                                                    {name: 'Board', icon: <LayoutDashboard size={16}/>},
                                                    {name: 'TNA', icon: <ClipboardCheck size={16}/>},
                                                    {name: 'Dashboard', icon: <PieChartIcon size={16}/>},
                                                    {name: 'Gantt', icon: <GanttChartSquare size={16}/>}
                                                ].map(view => (
                                                    <button key={view.name} onClick={() => setActiveView(view.name)} className={`flex items-center gap-2 py-1.5 px-3 text-sm font-semibold rounded-md transition-colors ${activeView === view.name ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                                                        {view.icon} <span className="hidden sm:inline">{view.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={() => handleEditOrder(activeOrder)}
                                                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2 text-sm"
                                            >
                                                <Edit size={16} /> Manage
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {transformedOrder && (
                                    <>
                                        {activeView === 'Details' && <OrderDetailsView order={transformedOrder} allFactories={factories} handleSetCurrentPage={props.handleSetCurrentPage} />}
                                        {activeView === 'List' && <ListView tasks={transformedOrder.tasks} />}
                                        {activeView === 'Board' && <BoardView tasks={transformedOrder.tasks} />}
                                        {activeView === 'TNA' && <TNAView tasks={transformedOrder.tasks} />}
                                        {activeView === 'Dashboard' && <DashboardView tasks={transformedOrder.tasks} orderKey={activeOrderKey || ''} orderDetails={transformedOrder}/>}
                                        {activeView === 'Gantt' && <GanttChartView tasks={transformedOrder.tasks} />}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Order Modal */}
            {isCreateOrderOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">Start New Order</h2>
                            <button onClick={() => setIsCreateOrderOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newOrderData.product_name}
                                    onChange={e => setNewOrderData({...newOrderData, product_name: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                    placeholder="e.g. 5000 Cotton T-Shirts"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Factory</label>
                                <select 
                                    required
                                    value={newOrderData.factory_id}
                                    onChange={e => setNewOrderData({...newOrderData, factory_id: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                >
                                    <option value="">-- Select Factory --</option>
                                    {factories.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                                <select 
                                    value={newOrderData.status}
                                    onChange={e => setNewOrderData({...newOrderData, status: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                >
                                    <option>Pending</option>
                                    <option>In Production</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCreateOrderOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md">Create Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Order Modal */}
            {isModalOpen && editingOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-2xl font-bold text-gray-800">Manage Order</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* Status Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
                                <select 
                                    value={editingOrder.status} 
                                    onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                >
                                    <option>Pending</option>
                                    <option>In Production</option>
                                    <option>Quality Check</option>
                                    <option>Shipped</option>
                                    <option>Completed</option>
                                </select>
                            </div>

                            {/* Tasks Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">Production Tasks</h3>
                                    <button onClick={addTask} className="text-sm text-purple-600 font-semibold flex items-center gap-1"><Plus size={16}/> Add Task</button>
                                </div>
                                <div className="space-y-3">
                                    {(editingOrder.tasks || []).map((task: any, idx: number) => (
                                        <div key={idx} className="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <input type="text" value={task.name} onChange={(e) => updateTask(idx, 'name', e.target.value)} className="flex-grow p-1 border rounded text-sm" placeholder="Task Name" />
                                            <select value={task.status} onChange={(e) => updateTask(idx, 'status', e.target.value)} className="p-1 border rounded text-sm">
                                                <option>TO DO</option><option>IN PROGRESS</option><option>COMPLETE</option>
                                            </select>
                                            <input type="date" value={task.plannedEndDate} onChange={(e) => updateTask(idx, 'plannedEndDate', e.target.value)} className="p-1 border rounded text-sm" />
                                            <button onClick={() => removeTask(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Documents Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">Documents</h3>
                                    <button onClick={addDocument} className="text-sm text-purple-600 font-semibold flex items-center gap-1"><Plus size={16}/> Add Document</button>
                                </div>
                                <div className="space-y-3">
                                    {(editingOrder.documents || []).map((doc: any, idx: number) => (
                                        <div key={idx} className="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <FileText size={16} className="text-gray-400" />
                                            <input type="text" value={doc.name} onChange={(e) => updateDocument(idx, 'name', e.target.value)} className="flex-grow p-1 border rounded text-sm" placeholder="Document Name" />
                                            <input type="text" value={doc.type} onChange={(e) => updateDocument(idx, 'type', e.target.value)} className="w-24 p-1 border rounded text-sm" placeholder="Type" />
                                            <button onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50 rounded-b-xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSaveOrder} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"><Save size={18} /> Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};