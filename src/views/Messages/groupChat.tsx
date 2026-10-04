'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
    addGroupMember,
    createGroup,
    removeGroupMember,
    updateGroup,
    updateGroupMemberRole,
} from '../../api/chat.api';
import { searchUsers } from '../../api/search.api';
import UserActivityStatus from '../../components/UserActivityStatus';
import UserBadge from '../../components/UserBadge';
import ActionButton from '../../components/Ui/ActionButton';
import DropFile from '../../components/Ui/DropFile';
import InputField from '../../components/Ui/InputField';
import SharePostModal from '../../components/SharePostModal';
import Popup from '../../components/Ui/Popup';
import PrimaryButton from '../../components/Ui/PrimaryButton';
import SearchSelect from '../../components/Ui/SearchSelect';
import ShareIcon from '../../assets/svg/share.svg';
import { FIELD_LIMITS } from '../../constants/fieldLimits';
import DefaultProfileAvatar from '../../assets/images/default-profile-avatar.png';
import ThreeDotsIcon from '../../assets/svg/three-dots.svg';
import { imageSrc } from '../../utils/image';

const roleLabel = (role: any) =>
    role === 'admin' ? 'Administrator' : 'Participant';

export const isGroupChat = (item: any) => item?.kind === 'group';

export function groupListPatch(detail: any, previous: any = {}) {
    return {
        ...previous,
        _id: detail._id,
        kind: 'group',
        title: detail.title,
        description: detail.description || '',
        photo: detail.photo || null,
        member_count: Array.isArray(detail.members)
            ? detail.members.length
            : previous.member_count,
        my_role: detail.my_role,
        participant: null,
    };
}

const TypingDots = () => (
    <span className="user_activity_status_dots" aria-hidden="true">
        <span />
        <span />
        <span />
    </span>
);

export function GroupFace({ item, stats, typing, typingInline }: any) {
    return (
        <div className="user_badge messages_group_face">
            <div className="user_badge_avatar">
                <img src={imageSrc(item?.photo, DefaultProfileAvatar)} alt="" />
            </div>
            <div className="user_badge_info">
                <div className="messages_group_title_row">
                    <p className="user_badge_info_name">
                        {item?.title || 'Group'}
                    </p>
                    {stats ? (
                        <p className="messages_group_subtitle">{stats}</p>
                    ) : null}
                    {typing && typingInline ? (
                        <p className="messages_group_typing messages_group_typing_inline">
                            <TypingDots />
                            <span className="messages_group_typing_names">
                                {typing}
                            </span>
                        </p>
                    ) : null}
                </div>
                {typing && !typingInline ? (
                    <p className="messages_group_typing">
                        <span className="messages_group_typing_names">
                            {typing}
                        </span>
                        <span className="messages_group_typing_label">
                            Typing
                        </span>
                        <TypingDots />
                    </p>
                ) : null}
            </div>
        </div>
    );
}

export function UserSearchSelect({
    excludeIds = [],
    onPick,
    placeholder = 'Search by nickname',
    className = '',
}: any) {
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState('');
    const [fieldKey, setFieldKey] = useState(0);
    const excludeKey = excludeIds.map(String).join(',');
    const timerRef = useRef<number | null>(null);
    const requestRef = useRef(0);

    const handleInput = (raw: string) => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
        }

        const needle = String(raw || '')
            .trim()
            .replace(/^@/, '');
        if (needle.length < 2) {
            requestRef.current += 1;
            setLoading(false);
            setOptions([]);
            return;
        }

        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        setLoading(true);

        timerRef.current = window.setTimeout(async () => {
            const users = await searchUsers(needle);
            if (requestId !== requestRef.current) {
                return;
            }

            const excluded = new Set(excludeKey.split(',').filter(Boolean));
            const next = (Array.isArray(users) ? users : [])
                .filter((user: any) => user?._id && !excluded.has(String(user._id)))
                .map((user: any) => ({
                    value: String(user._id),
                    name: user.nick_name || 'User',
                    user,
                    render: () => <UserBadge data={user} asLink={false} />,
                }));

            setOptions(next);
            setLoading(false);
        }, 250);
    };

    useEffect(
        () => () => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
        },
        [],
    );

    return (
        <SearchSelect
            key={fieldKey}
            className={className}
            options={options}
            value={value}
            placeholder={placeholder}
            emptyLabel="Nothing found"
            loading={loading}
            minSearchLength={2}
            onInput={handleInput}
            onChange={(next: any) => {
                const picked = options.find(
                    (option) => option.value === String(next),
                );
                setValue('');
                setOptions([]);
                setFieldKey((current) => current + 1);
                if (picked?.user) {
                    onPick(picked.user);
                }
            }}
        />
    );
}

const imageDropProps = {
    dropFileType: 'image/*',
    fileTypes: 'SVG, PNG, JPEG, JPG, and others',
};

export function CreateGroupForm({
    profileId,
    showToast,
    onClose,
    onCreated,
}: any) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const excludeIds = useMemo(
        () => [profileId, ...members.map((member) => member._id)],
        [profileId, members],
    );

    const handleCreate = async () => {
        const title = name.trim();
        if (title.length < FIELD_LIMITS.groupName.min || isSaving) {
            showToast?.({
                type: 'error',
                message: 'Enter a group name',
            });
            return;
        }

        setIsSaving(true);
        const result = await createGroup(
            {
                name: title,
                description: description.trim(),
                memberIds: members.map((member) => member._id),
            },
            photo,
        );
        setIsSaving(false);

        if (!result?.status) {
            showToast?.({
                type: 'error',
                message: result?.message || 'Could not create the group',
            });
            return;
        }

        onCreated(result.data);
        onClose();
    };

    return (
        <div className="messages_group_form">
            <DropFile value={photo} setValue={setPhoto} {...imageDropProps} />
            <InputField
                value={name}
                placeholder="Group name"
                length={FIELD_LIMITS.groupName.max}
                onChange={(event: any) => setName(event.target.value)}
            />
            <InputField
                value={description}
                placeholder="Description (optional)"
                isMultiline
                multilineRows={3}
                length={FIELD_LIMITS.groupDescription.max}
                onChange={(event: any) => setDescription(event.target.value)}
            />
            <UserSearchSelect
                excludeIds={excludeIds}
                onPick={(user: any) =>
                    setMembers((current) =>
                        current.some(
                            (member) => String(member._id) === String(user._id),
                        )
                            ? current
                            : [...current, user],
                    )
                }
            />
            {members.length ? (
                <ul className="messages_group_members">
                    {members.map((member) => (
                        <li key={member._id} className="messages_group_member">
                            <UserBadge data={member} asLink={false} />
                            <button
                                type="button"
                                className="messages_group_member_remove app-transition"
                                onClick={() =>
                                    setMembers((current) =>
                                        current.filter(
                                            (item) =>
                                                String(item._id) !==
                                                String(member._id),
                                        ),
                                    )
                                }
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
            <div className="messages_group_form_actions">
                <ActionButton onClick={onClose} disabled={isSaving}>
                    Cancel
                </ActionButton>
                <PrimaryButton isLoading={isSaving} onClick={handleCreate}>
                    Create
                </PrimaryButton>
            </div>
        </div>
    );
}

export function GroupSettings({
    conversation,
    profileId,
    showToast,
    showModalWindow,
    onClose,
    onUpdated,
    onLeft,
}: any) {
    const [group, setGroup] = useState(conversation);
    const [name, setName] = useState(conversation?.title || '');
    const [description, setDescription] = useState(
        conversation?.description || '',
    );
    const [photo, setPhoto] = useState<any>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const isAdmin = group?.my_role === 'admin';

    const apply = (data: any) => {
        if (data?.left || data?.kind !== 'group') {
            onLeft(group._id);
            onClose();
            return;
        }
        setGroup(data);
        setName(data.title || '');
        setDescription(data.description || '');
        setPhoto(null);
        setRemovePhoto(false);
        onUpdated(data);
    };

    const fail = (result: any, fallback: string) => {
        showToast?.({
            type: 'error',
            message: result?.message || fallback,
        });
    };

    const handleSave = async () => {
        if (!isAdmin || isSaving) {
            return;
        }
        setIsSaving(true);
        const result = await updateGroup(
            group._id,
            {
                name: name.trim(),
                description: description.trim(),
                removePhoto: removePhoto && !(photo instanceof File),
            },
            photo instanceof File ? photo : null,
        );
        setIsSaving(false);
        if (!result?.status) {
            fail(result, 'Could not update the group');
            return;
        }
        apply(result.data);
        showToast?.({ type: 'success', message: 'Group updated' });
    };

    const handleAdd = async (user: any) => {
        const result = await addGroupMember(group._id, user._id);
        if (!result?.status) {
            fail(result, 'Could not add this person');
            return;
        }
        apply(result.data);
    };

    const handleRemove = async (userId: any) => {
        const result = await removeGroupMember(group._id, userId);
        if (!result?.status) {
            fail(result, 'Could not remove this person');
            return;
        }
        apply(result.data);
    };

    const handleRole = async (userId: any, role: string) => {
        const result = await updateGroupMemberRole(group._id, userId, role);
        if (!result?.status) {
            fail(result, 'Could not change the role');
            return;
        }
        apply(result.data);
    };

    const members = Array.isArray(group?.members) ? group.members : [];
    const excludeIds = [profileId, ...members.map((member: any) => member._id)];

    const openShare = () => {
        showModalWindow?.({
            title: 'Share',
            size: 'small',
            showCloseButton: true,
            closeFunc: () => {},
            content: (
                <SharePostModal
                    sharePath={`/chats/${group._id}`}
                    postTitle={group.title || 'Group'}
                    linkLabel="Link to the chat"
                    excludeConversationId={group._id}
                    sentLabel="Link sent to the chat"
                    failLabel="Could not send the link"
                    loginHint="Log in to send this chat as a message."
                    showToast={showToast}
                    requestCloseModal={onClose}
                />
            ),
        });
    };

    return (
        <div className="messages_group_form">
            {isAdmin ? (
                <>
                    <DropFile
                        value={
                            photo instanceof File
                                ? photo
                                : removePhoto
                                  ? null
                                  : group?.photo
                        }
                        previewUrl={removePhoto ? null : group?.photo}
                        setValue={(file: any) => {
                            setPhoto(file instanceof File ? file : null);
                            setRemovePhoto(!(file instanceof File));
                        }}
                        onRemove={() => {
                            setPhoto(null);
                            setRemovePhoto(true);
                        }}
                        {...imageDropProps}
                    />
                    <InputField
                        value={name}
                        placeholder="Group name"
                        length={FIELD_LIMITS.groupName.max}
                        onChange={(event: any) => setName(event.target.value)}
                    />
                    <InputField
                        value={description}
                        placeholder="Description (optional)"
                        isMultiline
                        multilineRows={3}
                        length={FIELD_LIMITS.groupDescription.max}
                        onChange={(event: any) =>
                            setDescription(event.target.value)
                        }
                    />
                    <PrimaryButton isLoading={isSaving} onClick={handleSave}>
                        Save
                    </PrimaryButton>
                </>
            ) : null}
            <div className="messages_group_members_head">
                <p>Participants</p>
            </div>
            <div className="messages_group_add_row">
                {isAdmin ? (
                    <UserSearchSelect
                        className="messages_group_add_search"
                        excludeIds={excludeIds}
                        placeholder="Add people"
                        onPick={handleAdd}
                    />
                ) : null}
                <button
                    type="button"
                    className="messages_group_share app-transition app-transition-color"
                    aria-label="Share"
                    onClick={openShare}
                >
                    <ShareIcon />
                </button>
            </div>
            <ul className="messages_group_members">
                {members.map((member: any) => {
                    const isSelf = String(member._id) === String(profileId);
                    return (
                        <li key={member._id} className="messages_group_member">
                            <div className="messages_group_member_main">
                                <UserBadge data={member} />
                                <UserActivityStatus
                                    user={member}
                                    viewerId={profileId}
                                    className="messages_activity_status"
                                />
                            </div>
                            <span className="messages_group_role">
                                {roleLabel(member.role)}
                            </span>
                            {isAdmin && !isSelf ? (
                                <Popup
                                    body={[
                                        [
                                            {
                                                title:
                                                    member.role === 'admin'
                                                        ? 'Make participant'
                                                        : 'Make administrator',
                                                onClick: () =>
                                                    handleRole(
                                                        member._id,
                                                        member.role === 'admin'
                                                            ? 'member'
                                                            : 'admin',
                                                    ),
                                            },
                                            {
                                                title: 'Remove',
                                                type: 'danger',
                                                onClick: () =>
                                                    handleRemove(member._id),
                                            },
                                        ],
                                    ]}
                                >
                                    <button
                                        type="button"
                                        className="messages_group_member_menu app-transition"
                                        aria-label="Member actions"
                                    >
                                        <ThreeDotsIcon />
                                    </button>
                                </Popup>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
