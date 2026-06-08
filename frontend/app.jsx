// Main App component — composes useCustomers hook + CustomerItem sub-component
const { useState } = React;

function App() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [q, setQ] = useState("");
  const [inputQ, setInputQ] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const { items, totalPages, total, loading, error, reload } = useCustomers({
    page,
    limit,
    q
  });

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

  return (
    <main className="wrap">
      <section className="hero">
        <h1>Customers Explorer</h1>
        <p className="sub">React UI + SQLite API demo</p>
      </section>

      <section className="panel">
        <div className="toolbar">
          <input
            placeholder="Search by name, email, company, city"
            value={inputQ}
            onChange={e => setInputQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                setPage(1);
                setQ(inputQ);
              }
            }}
          />
          <button
            onClick={() => {
              setPage(1);
              setQ(inputQ);
            }}
          >
            Search
          </button>
        </div>

        <div className="meta">
          Page {page} / {totalPages} · {total} total
        </div>

        <ul className="list">
          {loading && <li className="status">Loading...</li>}
          {!loading && error && <li className="status">{error}</li>}
          {!loading && !error && items.length === 0 && (
            <li className="status">No customers found.</li>
          )}
          {!loading &&
            !error &&
            items.map(item => (
              <CustomerItem
                key={item.id}
                item={item}
                editingId={editingId}
                draft={draft}
                onBeginEdit={beginEdit}
                onChangeDraft={(field, value) =>
                  setDraft(prev => ({ ...prev, [field]: value }))
                }
                onSave={saveEdit}
                onCancel={() => {
                  setEditingId(null);
                  setDraft({});
                }}
                onDelete={handleDelete}
              />
            ))}
        </ul>

        <div className="actions">
          <button
            className="secondary"
            disabled={page <= 1}
            onClick={() => setPage(prev => prev - 1)}
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
