import "./MyLongButton.css";

function MyLongButton({ onClick, children }) {
  return (
    <div className="MyLongButton" onClick={onClick}>
      <div>{children}</div>
    </div>
  );
}

export default MyLongButton;
