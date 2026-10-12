import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useConfirmDialog } from '../components/contexts/ConfirmDialogContext';
import { useCheerMutations, useCheerPost } from './useCheerQueries';
import * as cheerApi from '../api/cheerApi';
import { parseError } from '../utils/errorUtils';

export type CheerEditVisualQaStateOverride = {
    postId?: number;
    favoriteTeam: string | null;
    post: cheerApi.CheerPost | null;
    isLoading: boolean;
    isError: boolean;
    hasAccess: boolean;
    content: string;
    existingImages: cheerApi.PostImageDto[];
    newFilePreviews: { file: File; url: string }[];
    deletingImageId: number | null;
    isDragging: boolean;
    isSubmitting: boolean;
    onSubmit?: () => void | Promise<void>;
    onCancel?: () => void;
};

export const useCheerEdit = (
    postId: number,
    favoriteTeam: string | null,
    visualQaStateOverride?: CheerEditVisualQaStateOverride,
) => {
    const navigate = useNavigate();
    const { confirm } = useConfirmDialog();
    const { updatePostMutation } = useCheerMutations();
    const {
        data: queriedPost,
        isLoading: queryLoading,
        error: queryError,
    } = useCheerPost(postId, { enabled: visualQaStateOverride === undefined });
    const post = visualQaStateOverride ? visualQaStateOverride.post : queriedPost;
    const loading = visualQaStateOverride?.isLoading ?? queryLoading;

    // const [post, setPost] = useState<cheerApi.CheerPost | null>(null); // Replaced by query
    // const [loading, setLoading] = useState(true); // Replaced by query
    const [error, setError] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);

    // const [title, setTitle] = useState(''); // Removed title state
    const [content, setContent] = useState(() => visualQaStateOverride?.content ?? '');

    // Image handling
    const [existingImages, setExistingImages] = useState<cheerApi.PostImageDto[]>(
        () => visualQaStateOverride?.existingImages ?? [],
    );
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newFilePreviews, setNewFilePreviews] = useState<{ file: File; url: string }[]>(
        () => visualQaStateOverride?.newFilePreviews ?? [],
    );
    const deletingImageId = visualQaStateOverride?.deletingImageId ?? null;
    const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]); // Track locally until submit

    const [isDragging, setIsDragging] = useState(() => visualQaStateOverride?.isDragging ?? false);
    // const [isSubmitting, setIsSubmitting] = useState(false); // Replaced by mutation status

    useEffect(() => {
        if (visualQaStateOverride || !post) return;

        // setTitle(post.title || ''); // Removed
        setContent(post.content || '');

        if (post.isOwner) {
            setHasAccess(true);
            // Load images for editing - separating side-effect fetching
            cheerApi.fetchPostImages(postId).then(setExistingImages).catch((err) => {
                console.error('Failed to fetch post images:', err);
            });
        } else {
            setHasAccess(false);
        }

    }, [post, postId, visualQaStateOverride]);

    // Error handling
    useEffect(() => {
        if (!visualQaStateOverride && queryError) setError(true);
    }, [queryError, visualQaStateOverride]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (files: File[]) => {
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        const combinedFiles = [...newFiles, ...validFiles].slice(0, 10 - existingImages.length); // Limit total images

        setNewFiles(combinedFiles);

        const newPreviews = validFiles.map(file => ({
            file,
            url: URL.createObjectURL(file)
        }));
        setNewFilePreviews(prev => [...prev, ...newPreviews].slice(0, 10));
    };

    const handleDeleteExistingImage = async (imgId: number) => {
        const confirmed = await confirm({ title: '이미지 삭제', description: '이미지를 삭제하시겠습니까? (저장 시 반영됩니다)', confirmLabel: '삭제', variant: 'destructive' });
        if (!confirmed) return;

        // 삭제는 저장 시점까지 보류하고, UI에서만 먼저 제외한다.
        setExistingImages(prev => prev.filter(img => img.id !== imgId));
        setDeletedImageIds(prev => [...prev, imgId]);
    };

    const handleRemoveNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
        setNewFilePreviews(prev => {
            const target = prev[index];
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };


    const handleSubmit = async () => {
        if (visualQaStateOverride) {
            await visualQaStateOverride.onSubmit?.();
            return;
        }
        try {
            await updatePostMutation.mutateAsync({
                id: postId,
                data: {
                    content,
                    images: existingImages.map((image) => image.storagePath),
                },
                newFiles,
                deletingImageIds: deletedImageIds,
            });
            toast.success('게시글이 수정되었습니다.');
            navigate(`/cheer/${postId}`);
        } catch (error) {
            const parsed = parseError(error);
            toast.error(parsed.message || '게시글 수정에 실패했습니다.');
        }
    };

    const handleCancel = () => {
        if (visualQaStateOverride) {
            visualQaStateOverride.onCancel?.();
            return;
        }
        navigate(-1);
    };

    return {
        post,
        isLoading: loading,
        isError: visualQaStateOverride?.isError ?? error,
        hasAccess: visualQaStateOverride?.hasAccess ?? hasAccess,
        // title, // Removed
        // setTitle, // Removed
        content,
        setContent,
        existingImages,
        newFilePreviews,
        deletingImageId,
        isDragging,
        isSubmitting: visualQaStateOverride?.isSubmitting ?? updatePostMutation.isPending,
        handleFileSelect,
        handleDeleteExistingImage,
        handleRemoveNewFile,
        handleSubmit,
        handleCancel,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
};
