function CustomerItem({
  item,
  editingId,
  draft,
  onBeginEdit,
  onChangeDraft,
  onSave,
  onCancel,
  onDelete
}) {
  const isEditing = editingId === item.id;

  return React.createElement(
    "li",
    { className: "item" },
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
          React.createElement(CustomerEditor, {
            draft,
            onChange: onChangeDraft
          }),
          React.createElement(
            "div",
            { className: "row-actions" },
            React.createElement("button", { onClick: () => onSave(item.id) }, "Save"),
            React.createElement("button", { className: "secondary", onClick: onCancel }, "Cancel")
          )
        )
      : React.createElement(
          "div",
          { className: "row-actions" },
          React.createElement("button", { onClick: () => onBeginEdit(item) }, "Edit"),
          React.createElement("button", { className: "warn", onClick: () => onDelete(item.id) }, "Delete")
        )
  );
}
