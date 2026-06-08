function CustomerEditor({ draft, onChange }) {
  const fields = [
    { key: "first_name", label: "First name" },
    { key: "last_name", label: "Last name" },
    { key: "email", label: "Email" },
    { key: "company", label: "Company" },
    { key: "city", label: "City" },
    { key: "title", label: "Title" }
  ];

  return (
    <div className="edit-grid">
      {fields.map(({ key, label }) => (
        <input
          key={key}
          value={draft[key] ?? ""}
          onChange={e => onChange(key, e.target.value)}
          placeholder={label}
        />
      ))}
    </div>
  );
}
