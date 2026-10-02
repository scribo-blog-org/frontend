'use client';

import ClockIcon from '../../assets/svg/clock.svg';

import './MessageStatus.scss';

const MessageStatus = ({ status }: any) => {
    if (!status) {
        return null;
    }

    if (status === 'sending') {
        return (
            <span
                className="message_status message_status_sending"
                aria-label="Sending"
            >
                <ClockIcon />
            </span>
        );
    }

    if (status === 'sent') {
        return (
            <span
                className="message_status message_status_sent"
                aria-label="Sent"
            >
                ✓
            </span>
        );
    }

    return (
        <span
            className="message_status message_status_read"
            aria-label="Read"
        >
            ✓✓
        </span>
    );
};

export default MessageStatus;
