'use client';

import './ModalFooter.scss';

const ModalFooter = ({ hint, children }: any) => (
    <div className="modal_footer">
        {hint ? <span className="modal_footer_hint">{hint}</span> : null}
        <div className="modal_footer_actions">{children}</div>
    </div>
);

export default ModalFooter;
