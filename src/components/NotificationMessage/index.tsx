'use client';

import { Link } from '@/navigation';

import { statusLabel } from '../../views/Support/constants';

const NotificationMessage = ({ item }: any) => {
    switch (item.type) {
        case 'follow':
            return 'Followed your updates';
        case 'unfollow':
            return 'Unfollowed you';
        case 'like_post':
            return (
                <>
                    Liked your{' '}
                    <Link
                        className="notification_link app-transition"
                        href={`/posts/${item.post}`}
                    >
                        post
                    </Link>
                </>
            );
        case 'comment_post':
            return (
                <>
                    Commented on your{' '}
                    <Link
                        className="notification_link app-transition"
                        href={`/posts/${item.post}`}
                    >
                        post
                    </Link>
                </>
            );
        case 'reply_comment':
            return (
                <>
                    Replied to{' '}
                    <Link
                        className="notification_link app-transition"
                        href={`/posts/${item.post}`}
                        state={{ comment: item.comment, time: Date.now() }}
                    >
                        your comment
                    </Link>
                </>
            );
        case 'mention_post':
            return (
                <>
                    Mentioned you in a{' '}
                    <Link
                        className="notification_link app-transition"
                        href={`/posts/${item.post}`}
                    >
                        post
                    </Link>
                </>
            );
        case 'mention_comment':
            return (
                <>
                    Mentioned you in a{' '}
                    <Link
                        className="notification_link app-transition"
                        href={`/posts/${item.post}`}
                        state={{ comment: item.comment, time: Date.now() }}
                    >
                        comment
                    </Link>
                </>
            );
        case 'support_reply':
            return (
                <>
                    A new reply to your{' '}
                    <Link
                        className="notification_link app-transition"
                        href={`/support/${item.support_request}`}
                    >
                        request
                    </Link>
                </>
            );
        case 'support_status':
            return (
                <>
                    Status of your{' '}
                    <Link
                        className="notification_link app-transition"
                        href={`/support/${item.support_request}`}
                    >
                        request
                    </Link>
                    : {statusLabel(item.support_status)}
                </>
            );
        default:
            return '';
    }
};

export default NotificationMessage;
