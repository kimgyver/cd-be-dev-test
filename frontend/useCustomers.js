const { useEffect, useState } = React;

function useCustomers({ page, limit, q }) {
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    load();
  }, [page, q]);

  return { items, totalPages, total, loading, error, reload: load };
}
