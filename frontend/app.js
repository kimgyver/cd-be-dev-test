setTimeout(() => {
  const { useState, useEffect } = React;

  function App() {
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [q, setQ] = useState("");
    const [inputQ, setInputQ] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState({});
    const [items, setItems] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function beginEdit(item) {
      setEditingId(item.id);
      setDraft({
        first_name: item.first_name || "",
        last_name: item.last_name || "",
        email: item.email || "",
        company: item.company || "",
        city: item.city || "",
        title: item.title || ""
      });
    }

    async function saveEdit(id) {
      try {
        await updateCustomer(id, draft);
        setEditingId(null);
        setDraft({});
        reload();
      } catch (err) {
        alert(err.message || "Update failed");
      }
    }

    async function handleDelete(id) {
      if (!window.confirm("Delete this customer?")) return;
      try {
        await deleteCustomer(id);
        if (items.length === 1 && page > 1) {
          setPage(prev => prev - 1);
        } else {
          reload();
        }
      } catch (err) {
        alert(err.message || "Delete failed");
      }
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchCustomers({ page, limit, q });
        setItems(data.items || []);
        setTotalPages(Math.max(1, data.totalPages || 1));
        setTotal(data.total || 0);
      } catch (err) {
        setError(err.message || "Failed to load customers");
      } finally {
        setLoading(false);
      }
    }

    function reload() {
      load();
    }

    useEffect(() => {
      load();
    }, [page, q]);

    const listItems = [];
    if (loading) {
      listItems.push(React.createElement("li", { className: "status", key: "loading" }, "Loading..."));
    } else if (error) {
      listItems.push(React.createElement("li", { className: "status", key: "error" }, error));
    } else if (items.length === 0) {
      listItems.push(React.createElement("li", { className: "status", key: "empty" }, "No customers found."));
    } else {
      items.forEach(item => {
        const isEditing = editingId === item.id;
        listItems.push(
          React.createElement(
            "li",
            { className: "item", key: item.id },
            React.createElement("span", { className: "name" }, `${item.first_name} ${item.last_name}`),
            React.createElement("span", { className: "line" }, item.email),
            React.createElement(
              "span",
              { className: "line" },
              `${item.company || "-"} · ${item.city || "-"} · ${item.title || "-"}`
            ),
            isEditing
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "div",
                    { className: "row-edit" },
                    ["first_name", "last_name", "email", "company", "city", "title"].map(key =>
                      React.createElement(
                        "div",
                        { key, className: "edit-field" },
                        React.createElement(
                          "label",
                          null,
                          key === "first_name" ? "First name" : key === "last_name" ? "Last name" : key.charAt(0).toUpperCase() + key.slice(1)
                        ),
                        React.createElement("input", {
                          type: "text",
                          value: draft[key] || "",
                          onChange: e => setDraft(prev => ({ ...prev, [key]: e.target.value }))
                        })
                      )
                    )
                  ),
                  React.createElement(
                    "div",
                    { className: "row-actions" },
                    React.createElement("button", { onClick: () => saveEdit(item.id) }, "Save"),
                    React.createElement("button", { className: "secondary", onClick: () => { setEditingId(null); setDraft({}); } }, "Cancel")
                  )
                )
              : React.createElement(
                  "div",
                  { className: "row-actions" },
                  React.createElement("button", { onClick: () => beginEdit(item) }, "Edit"),
                  React.createElement("button", { className: "warn", onClick: () => handleDelete(item.id) }, "Delete")
                )
          )
        );
      });
    }

    return React.createElement(
      "main",
      { className: "wrap" },
      React.createElement(
        "section",
        { className: "hero" },
        React.createElement("h1", null, "Customers Explorer"),
        React.createElement("p", { className: "sub" }, "React UI + SQLite API demo")
      ),
      React.createElement(
        "section",
        { className: "panel" },
        React.createElement(
          "div",
          { className: "toolbar" },
          React.createElement("input", {
            placeholder: "Search by name, email, company, city",
            value: inputQ,
            onChange: e => setInputQ(e.target.value),
            onKeyDown: e => {
              if (e.key === "Enter") {
                setPage(1);
                setQ(inputQ);
              }
            }
          }),
          React.createElement(
            "button",
            {
              onClick: () => {
                setPage(1);
                setQ(inputQ);
              }
            },
            "Search"
          )
        ),
        React.createElement(
          "div",
          { className: "meta" },
          `Page ${page} / ${totalPages} · ${total} total`
        ),
        React.createElement(
          "ul",
          { className: "list" },
          ...listItems
        ),
        React.createElement(
          "div",
          { className: "actions" },
          React.createElement(
            "button",
            {
              className: "secondary",
              disabled: page <= 1,
              onClick: () => setPage(prev => prev - 1)
            },
            "Prev"
          ),
          React.createElement(
            "button",
            {
              disabled: page >= totalPages,
              onClick: () => setPage(prev => prev + 1)
            },
            "Next"
          )
        )
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
}, 100);
