import "./DefaultContainer.scss";

export default function DefaultContainer({ children }: { children: React.ReactNode }) {
    return <div className="default-container">{children}</div>;
}
