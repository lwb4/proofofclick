import "./OverlayModal.css";

function OverlayModal({ children }) {
  return (
    <div className="OverlayModal">
      <div className="modal-contents">{children}</div>
    </div>
  );
}

export default OverlayModal;
