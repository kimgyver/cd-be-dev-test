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

  return (
    <li className="item">
      <span className="name">
        {item.first_name} {item.last_name}
      </span>
      <span className="line">{item.email}</span>
      <span className="line">
        {item.company || "-"} · {item.city || "-"} · {item.title || "-"}
      </span>

      {isEditing ? (
        <>
          <CustomerEditor draft={draft} onChange={onChangeDraft} />
          <div className="row-actions">
            <button onClick={() => onSave(item.id)}>Save</button>
            <button className="secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="row-actions">
          <button onClick={() => onBeginEdit(item)}>Edit</button>
          <button className="warn" onClick={() => onDelete(item.id)}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
