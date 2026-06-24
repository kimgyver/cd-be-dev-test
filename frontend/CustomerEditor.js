function CustomerEditor({ draft, onChange }) {
  const fields = [
    { key: "first_name", label: "First name" },
    { key: "last_name", label: "Last name" },
    { key: "email", label: "Email" },
    { key: "company", label: "Company" },
    { key: "city", label: "City" },
    { key: "title", label: "Title" }
  ];

  return React.createElement(
    "div",
    { className: "row-edit" },
    ...fields.map(({ key, label }) =>
      React.createElement(
        "div",
        { key, className: "edit-field" },
        React.createElement("label", null, label),
        React.createElement("input", {
          type: "text",
          value: draft[key] || "",
          onChange: e => onChange(key, e.target.value)
        })
      )
    )
  );
}
