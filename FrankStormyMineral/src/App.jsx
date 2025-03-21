import { useState, useCallback, useEffect, useMemo } from "react";
import "./App.css";
import * as db from "./database.js";
import syncService from "./syncService.js";

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    setIsLoading(true);

    try {
      await db.login(username, password);
      onLogin();
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-panel">
        <h2 className="auth-title">نظام إدارة المطعم</h2>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button" 
            disabled={isLoading}
          >
            {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("الرجاء ملء جميع الحقول");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    setIsLoading(true);

    try {
      await db.changePassword(currentPassword, newPassword);
      setSuccess("تم تغيير كلمة المرور بنجاح");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content change-password-modal">
        <div className="close-btn" onClick={onClose}>×</div>
        <h3>تغيير كلمة المرور</h3>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>كلمة المرور الحالية</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? "جاري تغيير كلمة المرور..." : "تغيير كلمة المرور"}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(db.getCurrentUser());
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [products, setProducts] = useState([]);
  const [cashRegister, setCashRegister] = useState([]);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [categories, setCategories] = useState(["الكل"]);
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [newOrders, setNewOrders] = useState([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [storeSettings, setStoreSettings] = useState(() => {
    const saved = localStorage.getItem('storeSettings');
    return saved ? JSON.parse(saved) : {
      name: "بن كافيه - Pin Cafe",
      logo: "",
      logoSize: 70,
      address: "",
      phone: "",
      cashierName: "",
      welcomeMessage: "زورونا مرة أخرى",
      invoiceSeq: 1,
    };
  });

  useEffect(() => {
    const globalTimerInterval = setInterval(() => {
      const activeTables = tables.filter(table => table.timer === "running");
      if (activeTables.length > 0) {
        setTables([...tables]);
      }
    }, 30000);
    return () => clearInterval(globalTimerInterval);
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('storeSettings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  const handleLogin = async () => {
    setUser(db.getCurrentUser());
    loadData();
  };

  const handleLogout = async () => {
    try {
      await db.logout();
      setUser(null);
      setTables([]);
      setProducts([]);
      setCashRegister([]);
      setSelectedTable(null);
    } catch (error) {
      setAlertMessage("حدث خطأ أثناء تسجيل الخروج");
    }
  };

  const loadData = async () => {
    try {
      setIsAuthLoading(true);
      setAlertMessage("جاري تحميل البيانات...");

      // تأخير قليل لعرض رسالة جاري التحميل
      await new Promise(resolve => setTimeout(resolve, 1000));

      const savedCategories = await db.getCategories();
      const categoryNames = savedCategories.map(cat => cat.name);
      if (categoryNames.length > 0) {
        setCategories(["الكل", ...categoryNames]);
      }

      const savedProducts = await db.getProducts();
      if (savedProducts.length > 0) {
        setProducts(savedProducts);
      } else {
        const defaultProducts = [
          { name: "برجر", price: 2500, category: "مشاوي" },
          { name: "بيتزا", price: 3500, category: "معجنات" },
          { name: "شاورما", price: 2000, category: "مشاوي" },
          { name: "كولا", price: 500, category: "مشروبات" },
          { name: "عصير برتقال", price: 1000, category: "مشروبات" },
          { name: "منتج بسعر مخصص", price: 0, category: "مشروبات", isCustomPrice: true },
        ];
        const newProducts = await Promise.all(defaultProducts.map(product => db.addProduct(product)));
        setProducts(newProducts);
      }

      const savedTables = await db.getTables();
      if (savedTables.length > 0) {
        setTables(savedTables);
      }

      const savedTransactions = await db.getTransactions();
      if (savedTransactions) {
        setCashRegister(savedTransactions);
      }

      setAlertMessage("تم تحميل البيانات بنجاح");
      setTimeout(() => setAlertMessage(""), 3000);
    } catch (error) {
      console.error("خطأ في تحميل البيانات:", error);
      setAlertMessage(`حدث خطأ: ${error.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const unsubscribe = syncService.subscribe(() => {
        loadData();
      });
      syncService.initialize();
      return () => unsubscribe();
    }
  }, [user]);


  const categoriesMemo = useMemo(() => {
    const productCategories = [...new Set(products.map((p) => p.category))].filter(Boolean);
    return ["الكل", ...productCategories];
  }, [products]);

  const handleTableClick = (index) => {
    setSelectedTable(index);
  };

 const addOrder = useCallback(async (tableIndex, product) => {
  try {
    const table = tables.find(t => t.id === tableIndex + 1);
    if (!table) return;

    const existingOrderIndex = table.orders.findIndex(order => order.id === product.id);
    let updatedTable;
    let quantityChange = 1;

    if (existingOrderIndex !== -1) {
      const updatedOrders = [...table.orders];
      updatedOrders[existingOrderIndex].quantity += 1;
      updatedTable = {
        ...table,
        orders: updatedOrders,
        total: table.total + product.price
      };
      setAlertMessage(`تم زيادة كمية ${product.name}`);
    } else {
      const newOrder = { ...product, quantity: 1 };
      updatedTable = {
        ...table,
        orders: [...table.orders, newOrder],
        total: table.total + newOrder.price,
      };
      setAlertMessage(`تم إضافة طلب: ${product.name}`);
    }

    // تحديث الواجهة فوراً
    setTables(prevTables => prevTables.map(t => (t.id === updatedTable.id ? updatedTable : t)));

    // تحديث الطلبات الجديدة
    setNewOrders(prev => {
      const existingNewOrder = prev.find(o => o.id === product.id && o.tableId === table.id);
      if (existingNewOrder) {
        // تحديث الكمية الموجودة بإضافة 1
        return prev.map(o =>
          o.id === product.id && o.tableId === table.id
            ? { ...o, quantity: o.quantity + quantityChange }
            : o
        );
      } else {
        // إضافة طلب جديد
        return [...prev, {
          ...product,
          quantity: quantityChange,
          tableId: table.id,
          timestamp: new Date().getTime()
        }];
      }
    });

    // حفظ في قاعدة البيانات بالخلفية
    await db.updateTable(updatedTable);
  } catch (error) {
    console.error("خطأ في إضافة الطلب:", error);
    setAlertMessage("حدث خطأ في إضافة الطلب");
  }
}, [tables, setNewOrders]);

  const updateOrder = async (tableIndex, orderIndex, newQuantity) => {
  if (newQuantity < 1) return;
  try {
    const table = tables.find(t => t.id === tableIndex + 1);
    if (!table) return;

    const updatedOrders = [...table.orders];
    const order = updatedOrders[orderIndex];
    const oldQuantity = order.quantity;
    const diff = newQuantity - oldQuantity; // قد يكون إيجابيًا أو سلبيًا
    updatedOrders[orderIndex].quantity = newQuantity;

    const updatedTable = {
      ...table,
      orders: updatedOrders,
      total: table.total + diff * order.price
    };

    // تحديث الواجهة
    setTables(prevTables => prevTables.map(t => (t.id === updatedTable.id ? updatedTable : t)));

    // تحديث newOrders بناءً على التغيير
    if (diff !== 0) {
      setNewOrders(prev => {
        const existingNewOrder = prev.find(o => o.id === order.id && o.tableId === table.id);
        if (existingNewOrder) {
          // تحديث الكمية في newOrders
          const updatedQuantity = existingNewOrder.quantity + diff;
          if (updatedQuantity <= 0) {
            // إذا أصبحت الكمية صفر أو أقل، حذف الطلب من newOrders
            return prev.filter(o => !(o.id === order.id && o.tableId === table.id));
          }
          return prev.map(o =>
            o.id === order.id && o.tableId === table.id
              ? { ...o, quantity: updatedQuantity }
              : o
          );
        } else if (diff > 0) {
          // إذا كان الفرق إيجابيًا ولا يوجد طلب في newOrders، أضفه
          return [...prev, {
            ...order,
            quantity: diff,
            tableId: table.id,
            timestamp: new Date().getTime()
          }];
        }
        return prev;
      });
    }

    // حفظ التغييرات في قاعدة البيانات
    await db.updateTable(updatedTable);
    await loadData();
  } catch (error) {
    console.error("خطأ في تحديث الطلب:", error);
    setAlertMessage("حدث خطأ في تحديث الطلب");
  }
};
  
  const deleteOrder = useCallback(async (tableIndex, orderIndex) => {
    try {
      const table = tables.find(t => t.id === tableIndex + 1);
      if (!table) return;

      const deletedOrder = table.orders[orderIndex];
      const updatedTable = {
        ...table,
        orders: table.orders.filter((_, idx) => idx !== orderIndex),
        total: table.total - deletedOrder.price * deletedOrder.quantity,
      };
      await db.updateTable(updatedTable);
      setTables(prevTables => prevTables.map(t => (t.id === updatedTable.id ? updatedTable : t)));

      // Remove the deleted order from newOrders if it exists
      setNewOrders(prev => prev.filter(order => 
        !(order.name === deletedOrder.name && 
          order.tableId === table.id && 
          order.price === deletedOrder.price)
      ));

      setAlertMessage("تم حذف الطلب");
      await loadData();
    } catch (error) {
      console.error("خطأ في حذف الطلب:", error);
      setAlertMessage("حدث خطأ في حذف الطلب");
    }
  }, [tables, loadData, setNewOrders]);

  const moveTableOrders = async (sourceTableIndex, targetTableIndex) => {
    try {
      const sourceTable = tables.find(t => t.id === sourceTableIndex + 1);
      const targetTable = tables.find(t => t.id === targetTableIndex + 1);
      if (!sourceTable || !targetTable || sourceTable.orders.length === 0) return;

      const updatedTargetTable = {
        ...targetTable,
        orders: [...targetTable.orders, ...sourceTable.orders],
        total: targetTable.total + sourceTable.total
      };
      const updatedSourceTable = { ...sourceTable, orders: [], total: 0, timer: sourceTable.timer, timerStartTime: sourceTable.timerStartTime };
      await db.updateTable(updatedTargetTable);
      await db.updateTable(updatedSourceTable);
      setTables(prevTables => prevTables.map(t => (t.id === updatedSourceTable.id ? updatedSourceTable : t.id === updatedTargetTable.id ? updatedTargetTable : t)));
      setSelectedTable(null);
      setAlertMessage(`تم نقل الطلبات من طاولة ${sourceTableIndex + 1} إلى طاولة ${targetTableIndex + 1}`);
      await loadData();
    } catch (error) {
      console.error("خطأ في نقل الطلبات:", error);
      setAlertMessage("حدث خطأ في نقل الطلبات");
    }
  };

  const mergeTables = async (firstTableIndex, secondTableIndex) => {
    try {
      const firstTable = tables.find(t => t.id === firstTableIndex + 1);
      const secondTable = tables.find(t => t.id === secondTableIndex + 1);
      if (!firstTable || !secondTable || (firstTable.orders.length === 0 && secondTable.orders.length === 0)) return;

      const updatedFirstTable = { ...firstTable, mergedWith: [...(firstTable.mergedWith || []), secondTable.id] };
      const updatedSecondTable = { ...secondTable, mergedWith: [...(secondTable.mergedWith || []), firstTable.id] };
      await db.updateTable(updatedFirstTable);
      await db.updateTable(updatedSecondTable);
      setTables(prevTables => prevTables.map(t => (t.id === updatedFirstTable.id ? updatedFirstTable : t.id === updatedSecondTable.id ? updatedSecondTable : t)));
      setAlertMessage(`تم دمج الطاولتين ${firstTableIndex + 1} و ${secondTableIndex + 1}`);
      await loadData();
    } catch (error) {
      console.error("خطأ في دمج الطاولات:", error);
      setAlertMessage("حدث خطأ في دمج الطاولات");
    }
  };

  const cancelMerge = async (tableIndex) => {
    try {
      const table = tables.find(t => t.id === tableIndex + 1);
      if (!table || !table.mergedWith || table.mergedWith.length === 0) return;

      const mergedWith = table.mergedWith;
      const updatedTables = [];
      const updatedTable = { ...table, mergedWith: [] };
      updatedTables.push(updatedTable);
      await db.updateTable(updatedTable);

      for (const mergedId of mergedWith) {
        const mergedTable = tables.find(t => t.id === mergedId);
        if (mergedTable) {
          const updatedMergedTable = { ...mergedTable, mergedWith: mergedTable.mergedWith.filter(id => id !== table.id) };
          updatedTables.push(updatedMergedTable);
          await db.updateTable(updatedMergedTable);
        }
      }
      setTables(prevTables => prevTables.map(t => updatedTables.find(ut => ut.id === t.id) || t));
      setAlertMessage("تم إلغاء الدمج");
      await loadData();
    } catch (error) {
      console.error("خطأ في إلغاء الدمج:", error);
      setAlertMessage("حدث خطأ في إلغاء الدمج");
    }
  };

  const clearTable = async (tableIndex, discountAmount = 0) => {
    if (!window.confirm("هل أنت متأكد من تصفية الحساب؟")) return;

    try {
      const table = tables.find(t => t.id === tableIndex + 1);
      if (!table) return;

      const mergedTableIds = table.mergedWith || [];
      let totalAmount = table.total;
      let mergedTableDetails = `طاولة ${tableIndex + 1}`;
      let allOrders = [...table.orders];
      const tablesToClear = [table.id];
      const updatedTables = [];

      if (mergedTableIds.length > 0) {
        for (const mergedId of mergedTableIds) {
          const mergedTable = tables.find(t => t.id === mergedId);
          if (mergedTable) {
            totalAmount += mergedTable.total;
            mergedTableDetails += ` + طاولة ${mergedId}`;
            tablesToClear.push(mergedId);
            allOrders = [...allOrders, ...mergedTable.orders];
            updatedTables.push({ ...mergedTable, orders: [], total: 0, mergedWith: [], timer: null, timerStartTime: null });
          }
        }
      }

      const finalAmount = Math.max(0, totalAmount - discountAmount);
      const discountDetails = discountAmount > 0 ? ` مع خصم ${discountAmount.toFixed(0)} د.ع` : '';
      const invoiceNumber = storeSettings.invoiceSeq || 1;

      setStoreSettings(prev => ({ ...prev, invoiceSeq: invoiceNumber + 1 }));
      localStorage.setItem('storeSettings', JSON.stringify({ ...storeSettings, invoiceSeq: invoiceNumber + 1 }));

      const transaction = {
        type: "deposit",
        transactionType: "مبيعات",
        amount: finalAmount,
        originalAmount: totalAmount,
        discountAmount: discountAmount,
        details: `مبيعات من ${mergedTableDetails}${discountDetails}`,
        invoiceNumber: invoiceNumber,
        date: new Date().toLocaleString(),
        items: allOrders.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        }))
      };

      console.log("معلومات المعاملة قبل الحفظ:", transaction);

      const savedTransaction = await db.addTransaction(transaction);
      console.log("المعاملة المحفوظة:", savedTransaction);

      setCashRegister(prev => {
        const updatedRegister = [...prev, savedTransaction];
        console.log("تم تحديث cashRegister:", updatedRegister);
        return updatedRegister;
      });

      const updatedMainTable = { ...table, orders: [], total: 0, mergedWith: [], timer: null, timerStartTime: null };
      updatedTables.push(updatedMainTable);
      for (const updatedTable of updatedTables) {
        await db.updateTable(updatedTable);
      }

      setTables(prevTables => prevTables.map(t => updatedTables.find(ut => ut.id === t.id) || t));
      setSelectedTable(null);
      setAlertMessage(`تم تصفية الحساب: ${mergedTableDetails} - فاتورة رقم: ${invoiceNumber} - المبلغ النهائي: ${finalAmount.toFixed(0)} د.ع`);
      await loadData();
    } catch (error) {
      console.error("خطأ في تصفية الطاولة:", error);
      setAlertMessage("حدث خطأ في تصفية الطاولة");
    }
  };

  const addProduct = async (name, price, category, updatedProducts, isCustomPrice = false) => {
    if (!name.trim() || (isCustomPrice === false && (isNaN(price) || price <= 0))) {
      setAlertMessage("الرجاء إدخال بيانات صحيحة");
      return;
    }
    try {
      if (updatedProducts) {
        setProducts(updatedProducts);
        setAlertMessage(`تم تعديل المنتج: ${name}`);
        return;
      }
      const newProduct = { name, price: isCustomPrice ? 0 : parseFloat(price), category, isCustomPrice };
      const savedProduct = await db.addProduct(newProduct);
      setProducts(prev => [...prev, savedProduct]);
      setAlertMessage(`تم إضافة منتج: ${name}`);
      await loadData();
    } catch (error) {
      console.error("خطأ في إضافة/تعديل المنتج:", error);
      setAlertMessage("حدث خطأ في إضافة/تعديل المنتج");
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm("هل تريد حذف هذا المنتج؟")) return;
    try {
      await db.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      setAlertMessage("تم حذف المنتج");
      await loadData();
    } catch (error) {
      console.error("خطأ في حذف المنتج:", error);
      setAlertMessage("حدث خطأ في حذف المنتج");
    }
  };

  const updateCashRegister = async (type, amount, notes) => {
    if (!amount || isNaN(amount)) {
      setAlertMessage("الرجاء إدخال مبلغ صحيح");
      return;
    }
    try {
      const transaction = {
        type,
        transactionType: type === "deposit" ? "إيداع" : "سحب",
        amount: parseFloat(amount),
        notes,
        date: new Date().toLocaleString(),
      };
      const savedTransaction = await db.addTransaction(transaction);
      setCashRegister(prev => [...prev, savedTransaction]);
      setAlertMessage(`${type === "deposit" ? "إيداع" : "سحب"} بـ ${amount} د.ع`);
      await loadData();
    } catch (error) {
      console.error("خطأ في تحديث الصندوق:", error);
      setAlertMessage("حدث خطأ في تحديث الصندوق");
    }
  };

  // إذا لم يكن المستخدم مسجل الدخول، عرض شاشة تسجيل الدخول
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="container">
      <header>
        <h1>{storeSettings.name}</h1>
        <div className="user-info">
          <span className="username">مرحباً، {user.username}</span>
        </div>
        <div className="nav-buttons">
          <button onClick={() => setSelectedTable("products")}>🛍️ إدارة المنتجات</button>
          <button onClick={() => setSelectedTable("cash")}>💰 إدارة الصندوق</button>
          <button onClick={() => setSelectedTable("reports")}>📊 تقارير المبيعات</button>
          <button onClick={() => setShowTableSettings(true)}>⚙️ إعدادات</button>
        </div>
      </header>

      {showTableSettings && (
        <TableSettingsPanel 
          tables={tables}
          setTables={setTables}
          storeSettings={storeSettings}
          setStoreSettings={setStoreSettings}
          onClose={() => setShowTableSettings(false)}
          handleLogout={handleLogout}
          showChangePassword={showChangePassword}
          setShowChangePassword={setShowChangePassword}
          loadData={loadData}
        />
      )}

      {alertMessage && (
        <div className="alert">
          <span>{alertMessage}</span>
        </div>
      )}

      <div className="tables-grid">
        {tables.map((table, index) => (
          <div
            key={index}
            className={`table-card ${table.orders.length > 0 ? "occupied" : "available"} ${table.mergedWith?.length > 0 ? "merged" : ""} ${table.timer === "running" ? "timer-active" : ""}`}
            onClick={() => handleTableClick(index)}
          >
            {table.customName || `طاولة ${index + 1}`}
            {table.orders.length > 0 && <div className="badge">{table.total.toFixed(0)} د.ع</div>}
            {table.mergedWith?.length > 0 && <div className="merged-badge">مدموجة</div>}
            {table.timer === "running" && <div className="timer-badge">⏱️</div>}
          </div>
        ))}
      </div>

      {selectedTable !== null && typeof selectedTable === "number" && (
        <OrderPanel
          table={tables[selectedTable]}
          tables={tables}
          setTables={setTables}
          tableIndex={selectedTable}
          products={products}
          categories={categoriesMemo}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddOrder={addOrder}
          onUpdateOrder={updateOrder}
          onDeleteOrder={deleteOrder}
          onClearTable={clearTable}
          onClose={() => setSelectedTable(null)}
          onMoveOrder={moveTableOrders}
          onMergeTables={mergeTables}
          onCancelMerge={cancelMerge}
          newOrders={newOrders}
          setNewOrders={setNewOrders}
        />
      )}

      {selectedTable === "products" && (
        <ProductsPanel
          products={products}
          categories={categoriesMemo}
          onAddProduct={addProduct}
          onDeleteProduct={deleteProduct}
          onClose={() => setSelectedTable(null)}
          loadData={loadData}
        />
      )}

      {selectedTable === "cash" && (
        <CashPanel
          transactions={cashRegister}
          onAddTransaction={updateCashRegister}
          onClose={() => setSelectedTable(null)}
        />
      )}

      {selectedTable === "reports" && (
        <ReportsPanel
          transactions={cashRegister}
          products={products}
          onClose={() => setSelectedTable(null)}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}

function TableSettingsPanel({ tables, setTables, storeSettings, setStoreSettings, onClose, handleLogout, showChangePassword, setShowChangePassword, loadData }) {
  const [activeTab, setActiveTab] = useState("tables");
  const [tableCount, setTableCount] = useState(tables.length);
  const [editableTables, setEditableTables] = useState(tables.map(t => ({ ...t, name: t.customName || `طاولة ${t.id}` })));
  const [updatedSettings, setUpdatedSettings] = useState(storeSettings);
  const [logoPreview, setLogoPreview] = useState(storeSettings.logo);
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    setEditableTables(tables.map(t => ({ ...t, name: t.customName || `طاولة ${t.id}` })));
    setTableCount(tables.length);
  }, [tables]);

  const saveTableChanges = async () => {
    try {
      const updatedTables = [...tables];
      let hasChanges = false;

      // Update existing tables
      for (let i = 0; i < updatedTables.length; i++) {
        const currentTable = updatedTables[i];
        const editedTable = editableTables.find(t => t.id === currentTable.id);

        if (editedTable) {
          const isDefaultName = editedTable.name === `طاولة ${currentTable.id}`;
          const newCustomName = isDefaultName ? null : editedTable.name;

          if (currentTable.customName !== newCustomName) {
            updatedTables[i] = {
              ...currentTable,
              customName: newCustomName
            };
            hasChanges = true;
          }
        }
      }

      // Handle table count changes
      if (tableCount > tables.length) {
        const newTablesCount = tableCount - tables.length;
        const lastId = Math.max(...tables.map(t => t.id), 0);
        for (let i = 0; i < newTablesCount; i++) {
          const newId = lastId + i + 1;
          updatedTables.push({ id: newId, orders: [], total: 0, customName: null });
        }
        hasChanges = true;
      } else if (tableCount < tables.length) {
        const activeTables = tables.slice(tableCount).filter(t => t.orders?.length > 0);
        if (activeTables.length > 0) {
          alert("لا يمكن تقليل عدد الطاولات لوجود طلبات نشطة على الطاولات التي ستحذف");
          setTableCount(tables.length);
          return;
        }
        updatedTables.length = tableCount;
        hasChanges = true;
      }

      if (hasChanges) {
        // Update tables in database
        for (const table of updatedTables) {
          await db.updateTable(table);
        }

        setTables(updatedTables);
        alert("تم حفظ التغييرات بنجاح");
      }
    } catch (error) {
      console.error("خطأ في حفظ تعديلات الطاولات:", error);
      alert("حدث خطأ أثناء حفظ التغييرات");
    }
  };

  const updateTableName = (id, newName) => {
    setEditableTables(prev => prev.map(table => table.id === id ? { ...table, name: newName } : table));
  };

  const saveStoreSettings = async () => {
    setStoreSettings(updatedSettings);
    alert("تم حفظ إعدادات المتجر بنجاح");
    await loadData();
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 500 * 1024) {
      alert("حجم الصورة كبير جدًا. اختر صورة أصغر من 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setLogoPreview(base64);
      setUpdatedSettings({ ...updatedSettings, logo: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleReset = async () => {
    if (window.confirm("⚠️ تحذير: سيتم حذف جميع البيانات.\nهل أنت متأكد؟") && window.confirm("⚠️ تأكيد أخير: لا يمكن التراجع. هل تريد المتابعة؟")) {
      try {
        db.closeConnection();
        await db.deleteDatabase();
        localStorage.clear();
        alert("تم مسح البيانات. سيتم إعادة التحميل...");
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error("خطأ في إعادة التعيين:", error);
        alert("حدث خطأ: " + error.message);
      }
    }
  };

  return (
    <div className="panel settings-panel">
      <div className="close-btn" onClick={onClose}>×</div>
      <h2>الإعدادات</h2>
      <div className="tab-buttons">
        <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>الملف الشخصي</button>
        <button className={activeTab === "tables" ? "active" : ""} onClick={() => setActiveTab("tables")}>إعدادات الطاولات</button>
        <button className={activeTab === "store" ? "active" : ""} onClick={() => setActiveTab("store")}>إعدادات المتجر والفواتير</button>
        <button className={activeTab === "system" ? "active" : ""} onClick={() => setActiveTab("system")}>إعدادات النظام</button>
      </div>

      {activeTab === "profile" && (
        <div className="profile-settings">
          <h3>إعدادات الملف الشخصي</h3>
          <div className="profile-actions">
            <button className="change-password-btn" onClick={() => setShowChangePassword(true)}>تغيير كلمة المرور</button>
            <button className="logout-btn" onClick={handleLogout}>تسجيل الخروج</button>
          </div>
        </div>
      )}

      {activeTab === "tables" && (
        <div className="tables-settings">```javascript
          <div className="table-count-control">
            <label>عدد الطاولات:</label>
            <input type="number" min="1" max="100" value={tableCount} onChange={(e) => setTableCount(parseInt(e.target.value) || 1)} />
          </div>
          <div className="table-names-list">
            <h3>أسماء الطاولات</h3>
            {editableTables.map(table => (
              <div key={table.id} className="table-name-item">
                <span>طاولة {table.id}:</span>
                <input type="text" value={table.name} onChange={(e) => updateTableName(table.id, e.target.value)} placeholder={`طاولة ${table.id}`} />
              </div>
            ))}
          </div>
          <button className="primary save-btn" onClick={saveTableChanges}>حفظ التغييرات</button>
        </div>
      )}

      {activeTab === "store" && (
        <div className="store-settings">
          <div className="form-group"><label>اسم المتجر</label><input type="text" value={updatedSettings.name} onChange={(e) => setUpdatedSettings({ ...updatedSettings, name: e.target.value })} /></div>
          <div className="form-group">
            <label>شعار المتجر</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
            {logoPreview && (
              <div className="logo-preview">
                <img src={logoPreview} alt="شعار المتجر" style={{ maxWidth: `${updatedSettings.logoSize || 70}%` }} />
                <div className="logo-size-control">
                  <label>حجم اللوجو (%): {updatedSettings.logoSize || 70} </label>
                  <input type="range" min="10" max="100" value={updatedSettings.logoSize || 70} onChange={(e) => setUpdatedSettings({ ...updatedSettings, logoSize: parseInt(e.target.value) })} />
                </div>
                <button onClick={() => { setLogoPreview(""); setUpdatedSettings({ ...updatedSettings, logo: "" }); }}>حذف الشعار</button>
              </div>
            )}
          </div>
          <div className="form-group"><label>عنوان المتجر</label><input type="text" value={updatedSettings.address} onChange={(e) => setUpdatedSettings({ ...updatedSettings, address: e.target.value })} /></div>
          <div className="form-group"><label>رقم الهاتف</label><input type="text" value={updatedSettings.phone} onChange={(e) => setUpdatedSettings({ ...updatedSettings, phone: e.target.value })} /></div>
          <div className="form-group"><label>اسم الكاشير</label><input type="text" value={updatedSettings.cashierName} onChange={(e) => setUpdatedSettings({ ...updatedSettings, cashierName: e.target.value })} /></div>
          <div className="form-group"><label>رسالة الترحيب</label><input type="text" value={updatedSettings.welcomeMessage} onChange={(e) => setUpdatedSettings({ ...updatedSettings, welcomeMessage: e.target.value })} /></div>
          <div className="form-group"><label>ترقيم تسلسل الفواتير يبدأ من:</label><input type="number" min="1" value={updatedSettings.invoiceSeq || 1} onChange={(e) => setUpdatedSettings({ ...updatedSettings, invoiceSeq: parseInt(e.target.value) || 1 })} /></div>
          <button className="primary save-btn" onClick={saveStoreSettings}>حفظ إعدادات المتجر</button>
        </div>
      )}

      {activeTab === "system" && (
        <div className="system-settings">
          <h3>إعدادات النظام</h3>

          <div className="settings-section">
            <h4>إعدادات المزامنة المحلية</h4>
            <p>المزامنة المحلية تسمح بمشاركة البيانات بين أجهزة متعددة على نفس الشبكة المحلية</p>

            <div className="form-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={Boolean(localStorage.getItem('syncEnabled') === 'true')} 
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    localStorage.setItem('syncEnabled', newValue);
                    db.toggleSync(newValue);
                    setDbCategories([...dbCategories]); // Force re-render
                    const message = newValue ? "تم تفعيل المزامنة المحلية" : "تم تعطيل المزامنة المحلية";
                    alert(message);
                  }} 
                /> 
                تفعيل المزامنة المحلية
              </label>
            </div>

            <div className="form-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={Boolean(localStorage.getItem('autoSyncEnabled') === 'true')} 
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    localStorage.setItem('autoSyncEnabled', newValue);
                    db.toggleAutoSync(newValue);
                    setDbCategories([...dbCategories]); // Force re-render
                    const message = newValue ? "سيتم تشغيل المزامنة تلقائيًا عند بدء التطبيق" : "تم تعطيل المزامنة التلقائية";
                    alert(message);
                  }} 
                /> 
                تشغيل المزامنة تلقائيًا عند بدء التطبيق
              </label>
            </div>

            {db.syncEnabled && (
              <div className="sync-info">
                <p>لاستخدام المزامنة على أجهزة أخرى:</p>
                <ol>
                  <li>شغل خادم المزامنة باستخدام الزر أدناه</li>
                  <li>استخدم عنوان الخادم المعروض على جميع الأجهزة في نفس الشبكة</li>
                </ol>
                <button 
                  className="sync-server-btn" 
                  onClick={() => {
                    window.open('/syncServer.html', '_blank');
                    alert("تم فتح صفحة خادم المزامنة");
                  }}
                >
                  تشغيل خادم المزامنة
                </button>
              </div>
            )}
          </div>

          <div className="settings-section">
            <h4>تحسين الأداء</h4>
            <p>إذا كان التطبيق بطيئًا، جرب هذه الإعدادات:</p>
            <ul className="performance-tips">
              <li>قلل عدد الطاولات إلى العدد الذي تحتاجه فقط</li>
              <li>قم بتنظيف المعاملات القديمة من خلال تصديرها ثم حذفها</li>
              <li>استخدم المزامنة المحلية بدلاً من Firebase</li>
            </ul>
          </div>

          <div className="settings-section">
            <h4>إعادة تعيين النظام</h4>
            <p className="warning-text">⚠️ سيتم حذف جميع البيانات (الطاولات، الطلبات، التقارير، الصندوق).</p>
            <button className="reset-btn danger-btn" onClick={handleReset}>إعادة تعيين كافة البيانات</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPanel({ transactions, products, onClose }) {
  const [startDate, setStartDate] = useState(() => new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState("sales");

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const txDate = new Date(t.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      return (!start || txDate >= start) && (!end || txDate <= new Date(end.setHours(23, 59, 59, 999))) && t.type === "deposit" && t.transactionType === "مبيعات";
    });
  }, [transactions, startDate, endDate]);

  const productSales = useMemo(() => {
    const sales = {};
    filteredTransactions.forEach(t => {
      if (t.items?.length > 0) {
        t.items.forEach(item => {
          sales[item.name] = sales[item.name] || { count: 0, total: 0, invoices: [] };
          sales[item.name].count += item.quantity;
          sales[item.name].total += item.total;
          if (t.invoiceNumber && !sales[item.name].invoices.includes(t.invoiceNumber)) sales[item.name].invoices.push(t.invoiceNumber);
        });
      }
    });
    return sales;
  }, [filteredTransactions]);

  const dailySales = useMemo(() => {
    const sales = {};
    filteredTransactions.forEach(t => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      sales[dateStr] = (sales[dateStr] || 0) + t.amount;
    });
    return Object.entries(sales).map(([date, amount]) => ({ date, amount })).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredTransactions]);

  const totalSales = useMemo(() => filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0), [filteredTransactions]);

  const exportToExcel = () => {
    if (typeof XLSX === 'undefined') {
      alert("جاري تحميل مكتبة Excel...");
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
      script.onload = () => alert("تم تحميل مكتبة Excel، حاول مرة أخرى.");
      document.body.appendChild(script);
      return;
    }

    const data = reportType === "sales" ?
      [["التاريخ", "المبلغ"], ...dailySales.map(day => [day.date, parseFloat(day.amount.toFixed(0))])] :
      [["المنتج", "عدد المرات", "إجمالي المبيعات"], ...Object.entries(productSales).map(([product, data]) => [product, data.count, parseFloat(data.total.toFixed(0))])];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportType === "sales" ? "المبيعات اليومية" : "المنتجات المباعة");
    XLSX.writeFile(wb, `تقرير_${reportType === "sales" ? "المبيعات_اليومية" : "المنتجات"}_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="panel reports-panel">
      <div className="close-btn" onClick={onClose}>×</div>
      <h2>تقارير المبيعات</h2>
      <div className="date-filter">
        <div className="form-group"><label>من تاريخ:</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="form-group"><label>إلى تاريخ:</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
      </div>
      <div className="report-type-selector">
        <button className={reportType === "sales" ? "active" : ""} onClick={() => setReportType("sales")}>المبيعات اليومية</button>
        <button className={reportType === "products" ? "active" : ""} onClick={() => setReportType("products")}>المنتجات المباعة</button>
      </div>
      <div className="report-summary">
        <h3>ملخص التقرير</h3>
        <p>الفترة: من {startDate} إلى {endDate}</p>
        <p>إجمالي المبيعات: {totalSales.toFixed(0)} د.ع</p>
        <p>عدد المعاملات: {filteredTransactions.length}</p>
      </div>
      {reportType === "sales" ? (
        <div className="daily-sales-report">
          <h3>المبيعات اليومية</h3>
          <table className="sales-table">
            <thead><tr><th>التاريخ</th><th>المبلغ</th></tr></thead>
            <tbody>{dailySales.map((day, i) => <tr key={i}><td>{new Date(day.date).toLocaleDateString()}</td><td>{day.amount.toFixed(0)} د.ع</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="product-sales-report">
          <h3>المنتجات المباعة</h3>
          <table className="sales-table">
            <thead><tr><th>المنتج</th><th>عدد المرات</th><th>إجمالي المبيعات</th></tr></thead>
            <tbody>{Object.entries(productSales).map(([product, data], i) => <tr key={i}><td>{product}</td><td>{data.count}</td><td>{data.total.toFixed(0)} د.ع</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="report-actions"><button className="export-btn" onClick={exportToExcel}>📊 تصدير إلى Excel</button></div>
    </div>
  );
}

function OrderPanel({ table, tables, setTables, tableIndex, products, categories, selectedCategory, onCategoryChange, onAddOrder, onUpdateOrder, onDeleteOrder, onClearTable, onClose, onMoveOrder, onMergeTables, onCancelMerge, newOrders, setNewOrders }) {
  const [editingOrder, setEditingOrder] = useState(null);
  const [showTableOperations, setShowTableOperations] = useState(false);
  const [targetTable, setTargetTable] = useState('');
  const [operationType, setOperationType] = useState('move');
  const [discount, setDiscount] = useState(0);
  const [customPrice, setCustomPrice] = useState('');
  const [customProduct, setCustomProduct] = useState(null);
  const [tempQuantity, setTempQuantity] = useState({});
  const totalAfterDiscount = useMemo(() => Math.max(0, table.total - discount), [table.total, discount]);
  const filteredProducts = selectedCategory === "الكل" ? products : products.filter(p => p.category === selectedCategory);

  const handleCustomPriceProduct = (product) => {
    const price = prompt("أدخل السعر المخصص:");
    if (price && !isNaN(price) && parseFloat(price) > 0) {
      const customPriceProduct = {
        ...product,
        price: parseFloat(price)
      };
      onAddOrder(tableIndex, customPriceProduct);
    }
  };

  const [timerState, setTimerState] = useState({
    running: table.timer === "running",
    startTime: table.timerStartTime || null,
    elapsed: "00:00:00"
  });

  useEffect(() => {
    if (table.timer === "running" && table.timerStartTime) {
      setTimerState({ running: true, startTime: parseInt(table.timerStartTime), elapsed: "00:00:00" });
    }
  }, [table]);

  useEffect(() => {
    let interval;
    const updateElapsedTime = () => {
      if (timerState.running && timerState.startTime) {
        const diff = new Date().getTime() - timerState.startTime;
        const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
        setTimerState(prev => ({ ...prev, elapsed: `${hours}:${minutes}:${seconds}` }));
      }
    };
    updateElapsedTime();
    if (timerState.running) interval = setInterval(updateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, [timerState.running, timerState.startTime]);

  const startTableTimer = async () => {
    try {
      const updatedTable = timerState.running
        ? { ...table, timer: null, timerStartTime: null }
        : { ...table, timer: "running", timerStartTime: new Date().getTime() };
      setTimerState(
        timerState.running
          ? { running: false, startTime: null, elapsed: "00:00:00" }
          : { running: true, startTime: updatedTable.timerStartTime, elapsed: "00:00:00" }
      );
      await db.updateTable(updatedTable);
      setTables(prevTables => prevTables.map(t => (t.id === updatedTable.id ? updatedTable : t)));
      if (timerState.running) onClose();
      await loadData();
    } catch (error) {
      console.error("خطأ في تحديث التايمر:", error);
      alert("حدث خطأ في تحديث التايمر");
    }
  };

  const printReceipt = () => {
    const storeInfo = JSON.parse(localStorage.getItem('storeSettings')) || {
      name: "بن كافيه - Pin Cafe",
      logo: "",
      logoSize: 70,
      address: "",
      phone: "",
      cashierName: "",
      welcomeMessage: "زورونا مرة أخرى"
    };
    const mergedTables = table.mergedWith || [];
    let allOrders = [...table.orders];
    let totalAmount = table.total;
    let mergedTablesInfo = '';

    if (mergedTables.length > 0) {
      mergedTablesInfo = `مدموجة مع الطاولات: ${mergedTables.join(', ')}\n`;
      tables.forEach(t => {
        if (mergedTables.includes(t.id)) {
          allOrders = [...allOrders, ...t.orders];
          totalAmount += t.total;
        }
      });
    }

    const finalTotal = discount > 0 ? Math.max(0, totalAmount - discount) : totalAmount;
    const invoiceNumber = storeInfo.invoiceSeq || 1;
    const timerInfo = timerState.running ? `<div class="timer-info">مدة الجلوس: ${timerState.elapsed}</div>` : '';

    const receiptContent = `
    <html>
    <head><title>فاتورة</title><style>@media print {body {font-family: 'Tajawal', Arial, sans-serif; text-align: center; direction: rtl; margin: 0; padding: 5px; width: 80mm; font-size: 12px;} h1 {font-size: 18px; margin: 5px 0;} .logo {max-width: ${storeInfo.logoSize || 70}%; max-height: 100px; margin: 10px auto; display: block;} .receipt-header {border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 10px;} .receipt-footer {border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; font-size: 14px; font-weight: bold;} .welcome-msg {margin-top: 15px; font-style: italic; font-size: 14px;} .item-row {display: flex; justify-content: space-between; padding: 3px 0;} .item-name {text-align: right; width: 50%;} .item-qty {text-align: center; width: 20%;} .item-price {text-align: left; width: 30%;} .total-row {font-weight: bold; margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px;} .table-info {font-weight: bold; margin: 5px 0;} .invoice-info {font-weight: bold; margin: 5px 0; font-size: 14px;} .timer-info {font-weight: bold; margin: 5px 0; font-size: 14px; color: #555;} .dashed-separator {border-top: 1px dashed #000; margin: 8px 0;} .discount-info {margin: 8px 0; font-weight: bold;} .store-info {margin: 5px 0; font-size: 12px;} .date-time {font-size: 12px; margin: 5px 0;} .current-total {font-size: 16px; font-weight: bold; margin: 10px 0; background-color: #f5f5f5; padding: 5px; border-radius: 5px;} .final-amount {font-size: 18px; font-weight: bold; margin: 10px 0; padding: 8px; background-color: #f0f0f0; border-radius: 5px; color: #e74c3c;}}</style></head>
    <body onload="window.print();window.setTimeout(window.close, 500);">
      <div class="receipt-header">${storeInfo.logo ? `<img src="${storeInfo.logo}" class="logo" alt="شعار المتجر"/>` : ''}<h1>${storeInfo.name}</h1>${storeInfo.address ? `<div class="store-info">${storeInfo.address}</div>` : ''}${storeInfo.phone ? `<div class="store-info">هاتف: ${storeInfo.phone}</div>` : ''}<div class="date-time">${new Date().toLocaleString()}</div>${storeInfo.cashierName ? `<div class="store-info">الكاشير: ${storeInfo.cashierName}</div>` : ''}</div>
      <div class="invoice-info">فاتورة رقم: ${invoiceNumber}</div>
      <div class="table-info">طاولة رقم: ${tableIndex + 1}${mergedTablesInfo}</div>
      ${timerInfo}
      ${mergedTables.length > 0 ? `<div class="merged-tables-summary"><div style="font-weight: bold; margin: 5px 0; border-bottom: 1px dotted #000;">تفاصيل الطاولات المدموجة</div><div>طاولة ${tableIndex + 1}: ${table.total.toFixed(0)} د.ع</div>${tables.filter(t => mergedTables.includes(t.id)).map(t => `<div>طاولة ${t.id}: ${t.total.toFixed(0)} د.ع</div>`).join('')}</div>` : ''}
      <div class="dashed-separator"></div>
      <div>${allOrders.map(item => `<div class="item-row"><div class="item-name">${item.name}</div><div class="item-qty">x${item.quantity}</div><div class="item-price">${(item.price * item.quantity).toFixed(0)} د.ع</div></div>`).join('')}
        <div class="total-row"><div class="item-row"><div class="item-name">المجموع:</div><div class="item-price">${totalAmount.toFixed(0)} د.ع</div></div>${discount > 0 ? `<div class="discount-info">الخصم: ${discount.toFixed(0)} د.ع</div><div class="item-row"><div class="item-name">الصافي:</div><div class="item-price">${finalTotal.toFixed(0)} د.ع</div></div>` : ''}</div>
      </div>
      <div class="receipt-footer">الإجمالي النهائي: ${finalTotal.toFixed(0)} د.ع</div>
      <div class="welcome-msg">${storeInfo.welcomeMessage}</div>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(receiptContent);
    printWindow.document.close();
  };

  const printOrdersForKitchen = () => {
    const storeInfo = JSON.parse(localStorage.getItem('storeSettings')) || {
      name: "بن كافيه - Pin Cafe",
      logo: "",
      logoSize: 70
    };

    const mergedTables = table.mergedWith || [];
    let allOrders = [...table.orders];
    let tableInfo = `طاولة ${tableIndex + 1}`;

    if (mergedTables.length > 0) {
      tableInfo += ` (مدموجة مع: ${mergedTables.join(', ')})`;
      tables.forEach(t => {
        if (mergedTables.includes(t.id)) {
          allOrders = [...allOrders, ...t.orders];
        }
      });
    }

    const kitchenOrderContent = `
    <html>
    <head>
      <title>طلبات للمطبخ</title>
      <style>
        @media print {
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            text-align: center;
            direction: rtl;
            margin: 0;
            padding: 5px;
            width: 80mm;
            font-size: 14px;
          }
          h1 {
            font-size: 20px;
            margin: 5px 0;
          }
          .logo {
            max-width: ${storeInfo.logoSize || 70}%;
            max-height: 80px;
            margin: 10px auto;
            display: block;
          }
          .kitchen-header {
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
            font-weight: bold;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dashed #ddd;
          }
          .item-name {
            text-align: right;
            font-weight: bold;
            font-size: 16px;
            width: 70%;
          }
          .item-qty {
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            width: 30%;
          }
          .table-info {
            font-weight: bold;
            margin: 10px 0;
            font-size: 16px;
            background-color: #f0f0f0;
            padding: 5px;
            border-radius: 5px;
          }
          .date-time {
            font-size: 12px;
            margin: 10px 0;
          }
        }
      </style>
    </head>
    <body onload="window.print();window.setTimeout(window.close, 500);">
      <div class="kitchen-header">
        ${storeInfo.logo ? `<img src="${storeInfo.logo}" class="logo" alt="شعار المتجر"/>` : ''}
        <h1>طلبات للمطبخ</h1>
      </div>
      <div class="table-info">${tableInfo}</div>
      <div class="date-time">${new Date().toLocaleString()}</div>
      <div>
        ${allOrders.map(item => `
          <div class="item-row">
            <div class="item-name">${item.name}</div>
            <div class="item-qty">x${item.quantity}</div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(kitchenOrderContent);
    printWindow.document.close();
  };

  const printNewOrdersForKitchen = (newOrders) => {
    // تجميع الطلبات الجديدة وحساب الكميات النهائية
    const currentOrders = table.orders;
    const aggregatedOrders = newOrders.filter(order => {
      return order.tableId === table.id && !order.printed;
    }).reduce((acc, order) => {
      const key = `${order.name}-${order.tableId}`;
      const currentOrder = currentOrders.find(o => o.name === order.name);
      if (!acc[key] && currentOrder) {
        acc[key] = {
          ...order,
          quantity: currentOrder.quantity,
          status: 'جديد'
        };
      }
      return acc;
    }, {});

    // تصفية الطلبات التي لديها كمية أكبر من 0 فقط
    const finalOrders = Object.values(aggregatedOrders).filter(order => order.quantity > 0);
    if (finalOrders.length === 0) {
      alert("لا توجد طلبات جديدة للطباعة");
      return;
    }

    const currentTableOrders = Object.values(aggregatedOrders);

    if (!currentTableOrders || currentTableOrders.length === 0) {
      alert("لا توجد طلبات جديدة للطباعة");
      return;
    }

    const storeInfo = JSON.parse(localStorage.getItem('storeSettings')) || {
      name: "بن كافيه - Pin Cafe",
      logo: "",
      logoSize: 70
    };

    // تجميع الطلبات حسب الطاولة
    const ordersByTable = {};
    currentTableOrders.forEach(order => {
      if (!ordersByTable[order.tableId]) {
        ordersByTable[order.tableId] = [];
      }
      ordersByTable[order.tableId].push(order);
    });

    let allTablesContent = '';
    Object.entries(ordersByTable).forEach(([tableId, orders]) => {
      const currentTable = tables.find(t => t.id === parseInt(tableId));
      let tableInfo = `طاولة ${currentTable.id}`;
      const mergedTables = currentTable.mergedWith || [];

      if (mergedTables.length > 0) {
        tableInfo += ` (مدموجة مع: ${mergedTables.join(', ')})`;
      }

      allTablesContent += `
        <div class="table-orders">
          <div class="table-info" style="background-color: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px;">
            <strong>${tableInfo}</strong>
          </div>
          <div class="orders-list">
            ${orders.map(item => `
              <div class="item-row">
                <div class="item-name">${item.name}</div>
                <div class="item-qty">${item.quantity}</div>
              </div>
            `).join('')}
          </div>
          <div style="border-bottom: 2px dashed #000; margin: 15px 0;"></div>
        </div>
      `;
    });

    const kitchenOrderContent = `
    <html>
    <head>
      <title>طلبات جديدة للمطبخ</title>
      <style>
        @media print {
          body {
            font-family: 'Tajawal', Arial, sans-serif;
            text-align: center;
            direction: rtl;
            margin: 0;
            padding: 5px;
            width: 80mm;
            font-size: 14px;
          }
          h1 {
            font-size: 20px;
            margin: 5px 0;
          }
          .logo {
            max-width: ${storeInfo.logoSize || 70}%;
            max-height: 80px;
            margin: 10px auto;
            display: block;
          }
          .kitchen-header {
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
            font-weight: bold;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px dashed #ddd;
          }
          .item-name {
            text-align: right;
            font-weight: bold;
            font-size: 16px;
            width: 70%;
          }
          .item-qty {
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            width: 30%;
          }
          .table-info {
            font-weight: bold;
            margin: 10px 0;
            font-size: 16px;
            background-color: #f0f0f0;
            padding: 5px;
            border-radius: 5px;
          }
          .date-time {
            font-size: 12px;
            margin: 10px 0;
          }
          .new-orders-title {
            background-color: #ffcccc;
            padding: 5px;
            margin: 5px 0;
            font-weight: bold;
            border-radius: 5px;
          }
          .table-orders {
            margin-bottom: 20px;
          }
        }
      </style>
    </head>
    <body onload="window.print();window.setTimeout(window.close, 500);">
      <div class="kitchen-header">
        ${storeInfo.logo ? `<img src="${storeInfo.logo}" class="logo" alt="شعار المتجر"/>` : ''}
        <h1>طلبات جديدة للمطبخ</h1>
      </div>
      <div class="date-time">${new Date().toLocaleString()}</div>
      <div class="new-orders-title">طلبات جديدة</div>
      ${allTablesContent}
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(kitchenOrderContent);
    printWindow.document.close();
  };

  const confirmQuantityChange = (idx, newQty) => {
    if (newQty >= 1) {
      const order = table.orders[idx];
      const oldQty = order.quantity;
      const diff = newQty - oldQty;

      if (diff !== 0) {
        const newOrderItem = {
          ...order,
          quantity: Math.abs(diff),
          tableId: table.id,
          timestamp: new Date().getTime(),
          change: diff > 0 ? 'increase' : 'decrease',
          printed: false
        };
        setNewOrders(prev => [...prev, newOrderItem]);
      }

      onUpdateOrder(tableIndex, idx, newQty);
      setEditingOrder(null);
      setTempQuantity(prev => ({ ...prev, [idx]: undefined }));
    }
  };

  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false);
  const [customPriceValue, setCustomPriceValue] = useState('');
  const handleConfirmCustomPrice = () => {
    if (customPriceValue && !isNaN(customPriceValue) && parseFloat(customPriceValue) > 0) {
      const customPriceProduct = { ...customProduct, price: parseFloat(customPriceValue) };
      onAddOrder(tableIndex, customPriceProduct);
      setShowCustomPriceModal(false);
      setCustomPriceValue('');
      setCustomProduct(null);
    } else {
      alert("الرجاء إدخال سعر صالح");
    }
  };


  return (
    <div className="panel">
      <div className="close-btn" onClick={onClose}>×</div>
      <h2>إدارة الطلبات - {table?.customName || `طاولة ${tableIndex + 1}`}{table?.mergedWith?.length > 0 && <span className="merge-info"> (مدموجة مع: {table.mergedWith.join(', ')})</span>}</h2>
      <div className="categories">
        {categories.map((cat, index) => (
          <button key={index} className={selectedCategory === cat ? "active" : ""} onClick={() => onCategoryChange(cat)}>{cat}</button>
        ))}
      </div>
      <div className="orders-container">
        <div className="products-section">
          <div className="products-grid">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                className="product-card"
                onClick={() => {
                  console.log("النقر على المنتج:", p, "للطاولة:", tableIndex);
                  p.isCustomPrice ? (setCustomProduct(p), setShowCustomPriceModal(true)) : onAddOrder(tableIndex, p);
                }}
              >
                <span>{p.name}</span>
                <span>{p.isCustomPrice ? 'سعر مخصص' : `${p.price.toFixed(0)} د.ع`}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="orders-list">
          {table?.orders?.map((order, idx) => (
            <div key={idx} className="order-item">
              <span>{order?.name || ''} (x{tempQuantity[idx] !== undefined ? tempQuantity[idx] : order?.quantity || 0}) - {((tempQuantity[idx] !== undefined ? tempQuantity[idx] : order?.quantity || 0) * (order?.price || 0)).toFixed(0)} د.ع</span>
              <div className="order-actions">
                <input
                  type="number"
                  min="1"
                  value={tempQuantity[idx] !== undefined ? tempQuantity[idx] : order.quantity}
                  onChange={(e) => setTempQuantity(prev => ({ ...prev, [idx]: parseInt(e.target.value) || 1 }))}
                  onFocus={() => setEditingOrder(idx)}
                />
                {editingOrder === idx && (
                  <button onClick={() => confirmQuantityChange(idx, tempQuantity[idx] || order.quantity)}>
                    ✔️
                  </button>
                )}
                <button onClick={() => onDeleteOrder(tableIndex, idx)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel-footer">
        <div className="total">الإجمالي: {(table?.total || 0).toFixed(0)} د.ع</div>
        <div className="discount-group">
          <label>الخصم:</label>
          <input
            type="number"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(Math.min(parseFloat(e.target.value) || 0, table.total))}
            placeholder="0"
          />
          <span>بعد الخصم: {totalAfterDiscount.toFixed(0)} د.ع</span>
        </div>
        <div className="panel-actions">
          <button className="timer-btn" onClick={startTableTimer}>
            {timerState.running ? `إنهاء (${timerState.elapsed})` : "بدء التايمر"}
          </button>
          <button onClick={printReceipt}>🖨️ طباعة الفاتورة</button>
          <button onClick={printOrdersForKitchen}>🧑‍🍳 طباعة للمطبخ</button>
          <button 
            onClick={() => {
              printNewOrdersForKitchen(newOrders);
              // Mark all printed orders
              const updatedOrders = newOrders.map(order => ({
                ...order,
                printed: true
              }));
              setNewOrders(updatedOrders.filter(order => !order.printed));
            }}
            disabled={newOrders.length === 0}
            style={{backgroundColor: newOrders.length > 0 ? '#e74c3c' : '#95a5a6'}}
          >
            🔔 طباعة الجديد ({newOrders.length})
          </button>
          <button onClick={() => setShowTableOperations(true)}>🔄 عمليات الطاولات</button>
          <button className="primary" onClick={() => onClearTable(tableIndex, discount)}>✔️ تصفية الحساب</button>
        </div>
      </div>
      {showCustomPriceModal && (
        <div className="modal-overlay">
          <div className="modal-content custom-price-modal">
            <h3>أدخل السعر المخصص</h3>
            <input
              type="number"
              value={customPriceValue}
              onChange={(e) => setCustomPriceValue(e.target.value)}
              placeholder="السعر"
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={handleConfirmCustomPrice}>تأكيد</button>
              <button onClick={() => setShowCustomPriceModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {showTableOperations && (
        <div className="table-operations-modal">
          <div className="modal-content">
            <h3>عمليات الطاولات</h3>
            <div className="operation-type">
              <label><input type="radio" checked={operationType === 'move'} onChange={() => setOperationType('move')} /> نقل الطلبات</label>
              <label><input type="radio" checked={operationType === 'merge'} onChange={() => setOperationType('merge')} /> دمج الطاولات</label>
            </div>
            {table.mergedWith?.length > 0 && operationType === 'merge' && (
              <button className="danger-btn" onClick={() => { onCancelMerge(tableIndex); setShowTableOperations(false); }}>
                إلغاء الدمج
              </button>
            )}
            <div className="form-group">
              <label>رقم الطاولة المستهدفة:</label>
              <input
                type="number"
                min="1"
                max={tables.length}
                value={targetTable}
                onChange={(e) => setTargetTable(e.target.value)}
                placeholder={`1-${tables.length}`}
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  const targetIdx = parseInt(targetTable) - 1;
                  if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= tables.length || targetIdx === tableIndex) {
                    alert("يرجى اختيار طاولة صالحة ومختلفة");
                    return;
                  }
                  operationType === 'move' ? onMoveOrder(tableIndex, targetIdx) : onMergeTables(tableIndex, targetIdx);
                  setShowTableOperations(false);
                  setTargetTable('');
                }}
              >
                تأكيد
              </button>
              <button onClick={() => setShowTableOperations(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsPanel({ products = [], categories = [], onAddProduct, onDeleteProduct, onClose, loadData }) {
  const [activeTab, setActiveTab] = useState("products");
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "", isCustomPrice: false });
  const [editingProduct, setEditingProduct] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [dbCategories, setDbCategories] = useState(() => {
    const filteredCategories = categories.filter(cat => cat !== "الكل");
    return filteredCategories.length > 0 ? filteredCategories : ["مشروبات", "مشاوي", "معجنات"];
  });

  useEffect(() => {
    setDbCategories(categories.filter(cat => cat !== "الكل"));
    if (categories.length > 1 && !newProduct.category) {
      setNewProduct(prev => ({ ...prev, category: categories[1] }));
    }
  }, [categories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim() || (!newProduct.isCustomPrice && (isNaN(newProduct.price) || newProduct.price <= 0))) {
      alert("الرجاء إدخال بيانات صحيحة");
      return;
    }
    try {
      if (editingProduct) {
        const updatedProduct = { ...editingProduct, name: newProduct.name, price: newProduct.isCustomPrice ? 0 : parseFloat(newProduct.price), category: newProduct.category, isCustomPrice: newProduct.isCustomPrice };
        await db.updateProduct(updatedProduct);
        setEditingProduct(null);
      } else {
        await onAddProduct(newProduct.name, newProduct.price, newProduct.category, null, newProduct.isCustomPrice);
      }
      setNewProduct({ name: "", price: "", category: categories.filter(c => c !== "الكل")[0] || "", isCustomPrice: false });
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("حدث خطأ في العملية");
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct({ name: product.name, price: product.price.toString(), category: product.category, isCustomPrice: product.isCustomPrice });
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      alert("الرجاء إدخال اسم القسم");
      return;
    }
    try {
      const exists = dbCategories.includes(newCategory);
      if (exists && !editingCategory) {
        alert("هذا القسم موجود بالفعل");
        return;
      }

      if (editingCategory) {
        await db.updateCategory(editingCategory, newCategory);
        setEditingCategory(null);
      } else {
        await db.addCategory({ name: newCategory });
      }

      setNewCategory("");
      await loadData();
    } catch (error) {
      console.error("خطأ في إدارة القسم:", error);
      alert("حدث خطأ في إضافة/تعديل القسم");
    }
  };

  const handleDeleteCategory = async (category) => {
    if (products.some(p => p.category === category)) {
      alert("لا يمكن حذف القسم لوجود منتجات مرتبطة به.");
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف القسم "${category}"؟`)) {
      try {
        await db.deleteCategory(category);
        setDbCategories(prev => prev.filter(c => c !== category));
        await loadData();
      } catch (error) {
        console.error("خطأ في حذف القسم:", error);
        alert("حدث خطأ في حذف القسم");
      }
    }
  };

  return (
    <div className="panel products-panel">
      <div className="close-btn" onClick={onClose}>×</div>
      <h2>إدارة المنتجات</h2>

      <div className="tab-buttons">
        <button 
          className={`tab-button ${activeTab === "products" ? "active" : ""}`} 
          onClick={() => setActiveTab("products")}
        >
          المنتجات
        </button>
        <button 
          className={`tab-button ${activeTab === "categories" ? "active" : ""}`} 
          onClick={() => setActiveTab("categories")}
        >
          الأقسام
        </button>
      </div>

      {activeTab === "products" && (
        <div className="products-section">
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>اسم المنتج:</label>
              <input 
                type="text" 
                placeholder="اسم المنتج" 
                value={newProduct.name} 
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} 
                required 
              />
            </div>

            <div className="form-group custom-price-toggle">
              <label>
                <input 
                  type="checkbox" 
                  checked={newProduct.isCustomPrice} 
                  onChange={(e) => setNewProduct({ 
                    ...newProduct, 
                    isCustomPrice: e.target.checked, 
                    price: e.target.checked ? "" : newProduct.price 
                  })} 
                />
                منتج بسعر مخصص
              </label>
            </div>

            {!newProduct.isCustomPrice && (
              <div className="form-group">
                <label>السعر:</label>
                <input 
                  type="number" 
                  placeholder="السعر" 
                  value={newProduct.price} 
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} 
                  required 
                />
              </div>
            )}

            <div className="form-group">
              <label>القسم:</label>
              <select 
                value={newProduct.category} 
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                required
              >
                <option value="">اختر القسم</option>
                {dbCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button">
                {editingProduct ? "تحديث المنتج" : "إضافة منتج"}
              </button>
              {editingProduct && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingProduct(null);
                    setNewProduct({ 
                      name: "", 
                      price: "", 
                      category: dbCategories[0] || "", 
                      isCustomPrice: false 
                    });
                  }}
                  className="secondary-button"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>

          <div className="products-grid">
            {Array.isArray(products) && products.map(product => (
              <div key={product.id || Math.random()} className="product-card">
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="price">
                    {product.isCustomPrice ? 'سعر مخصص' : `${(product.price || 0).toFixed(0)} د.ع`}
                  </p>
                  <p className="category">{product.category}</p>
                </div>
                <div className="product-actions">
                  <button 
                    className="edit-button"
                    onClick={() => handleEditProduct(product)}
                  >
                    تعديل
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => onDeleteProduct(product.id)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="categories-section">
          <form className="category-form" onSubmit={handleCategorySubmit}>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="اسم القسم" 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)} 
                required 
              />
              <button type="submit" className="primary-button">
                {editingCategory ? "تحديث القسم" : "إضافة قسم"}
              </button>
              {editingCategory && (
                <button 
                  type="button" 
                  onClick={() => { 
                    setEditingCategory(null); 
                    setNewCategory(""); 
                  }}
                  className="secondary-button"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>

          <div className="categories-list">
            {dbCategories.map((category) => (
              <div key={category} className="category-item">
                <span className="category-name">{category}</span>
                <div className="category-actions">
                  <button 
                    className="edit-button"
                    onClick={() => { 
                      setEditingCategory(category); 
                      setNewCategory(category); 
                    }}
                  >
                    تعديل
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CashPanel({ transactions, onAddTransaction, onClose }) {
  const [type, setType] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("الكل");

  const totalCash = useMemo(() => {
    return transactions.reduce((total, t) => t.type === "deposit" ? total + t.amount : total - t.amount, 0);
  }, [transactions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;
    try {
      await onAddTransaction(type, parseFloat(amount), notes);
      setAmount("");
      setNotes("");
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      alert("حدث خطأ في العملية");
    }
  };

  const filteredTransactions = transactions.filter(t => (!filterDate || new Date(t.date).toISOString().split("T")[0] === filterDate) && (filterType === "الكل" || t.transactionType === filterType));

  const exportToExcel = () => {
    if (typeof XLSX === 'undefined') {
      alert("جاري تحميل مكتبة Excel...");
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
      script.onload = () => alert("تم تحميل مكتبة Excel، حاول مرة أخرى.");
      document.body.appendChild(script);
      return;
    }

    const data = [["النوع", "المبلغ", "التاريخ", "التفاصيل", "رقم الفاتورة", "المبلغ قبل الخصم", "قيمة الخصم"], ...filteredTransactions.map(t => [t.transactionType || "", t.amount.toFixed(0), t.date || "", t.details || t.notes || "", t.invoiceNumber || "", t.originalAmount?.toFixed(0) || "", t.discountAmount?.toFixed(0) || ""])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الصندوق");
    XLSX.writeFile(wb, `تقرير_الصندوق_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
      script.async = true;
      document.body.appendChild(script);
      return () => document.body.removeChild(script);
    }
  }, []);

  return (
    <div className="panel">
      <div className="close-btn" onClick={onClose}>×</div>
      <h2>إدارة الصندوق</h2>
      <div className="cash-total"><h3>إجمالي الصندوق: <span>{totalCash.toFixed(0)}</span> د.ع</h3></div>
      <form onSubmit={handleSubmit}>
        <select value={type} onChange={(e) => setType(e.target.value)}><option value="deposit">إيداع</option><option value="withdraw">سحب</option></select>
        <input type="number" step="0.01" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input type="text" placeholder="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="submit">تأكيد</button>
      </form>
      <div className="filters">
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}><option value="الكل">الكل</option><option value="مبيعات">مبيعات</option><option value="إيداع">إيداع</option><option value="سحب">سحب</option></select>
      </div>
      <div className="export-backup-actions"><button onClick={exportToExcel} className="export-btn">📊 تصدير إلى Excel</button></div>
      <h3>سجل العمليات:</h3>
      {filteredTransactions.length === 0 ? <div className="empty-message">لا توجد عمليات مسجلة</div> : (
        <table className="transactions-table">
          <thead><tr><th>النوع</th><th>المبلغ</th><th>التاريخ</th><th>رقم الفاتورة</th><th>التفاصيل</th><th>المبلغ قبل الخصم</th><th>قيمة الخصم</th></tr></thead>
          <tbody>{filteredTransactions.map((t, i) => (
            <tr key={i}><td>{t.transactionType}</td><td>{t.amount.toFixed(0)} د.ع</td><td>{t.date}</td><td>{t.invoiceNumber || "-"}</td><td>{t.details || t.notes || "-"}</td><td>{t.originalAmount ? t.originalAmount.toFixed(0) + " د.ع" : "-"}</td><td>{t.discountAmount ? t.discountAmount.toFixed(0) + " د.ع" : "-"}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

export default App;