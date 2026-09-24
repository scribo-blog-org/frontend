'use client';

import "./FullContainer.scss"

const FullContainer = ({ children }) => {
    return (
        <div className="full-container">
            {children}
        </div>
    );
}

export default FullContainer;
