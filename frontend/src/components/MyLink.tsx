import "./MyLink.css";

function MyLink({ onClick, value }) {
  return (
    <span className="MyLink" onClick={onClick}>
      {value}
    </span>
  );
}

export default MyLink;
