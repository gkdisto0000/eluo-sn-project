'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { Header } from '@/components/Header'
import { getFirestore, doc, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore'

export default function DetailContent({ id }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { darkMode } = useTheme()
  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchProjectDetail = async () => {
      if (!user) return
      
      try {
        const db = getFirestore()
        const projectRef = doc(db, 'projects', user.uid, 'userProjects', id)
        const projectSnap = await getDoc(projectRef)

        if (projectSnap.exists()) {
          const data = projectSnap.data()
          setProject({
            id: projectSnap.id,
            title: data.title || '제목 없음',
            description: data.description || '',
            status: data.status || '대기',
            startDate: data.startDate?.toDate().toLocaleDateString(),
            endDate: data.endDate?.toDate().toLocaleDateString(),
            team: data.team || [],
            availableHours: data.availableHours || 0,
            createAt: data.createAt?.toDate().toLocaleDateString(),
            updateAt: data.updateAt?.toDate().toLocaleDateString()
          })
        } else {
          setError('프로젝트를 찾을 수 없습니다.')
          console.error('프로젝트가 존재하지 않습니다')
        }
      } catch (error) {
        setError('프로젝트 로딩 중 오류가 발생했습니다.')
        console.error('Error fetching project:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!loading) {
      if (!user) {
        router.push('/')
      } else {
        fetchProjectDetail()
      }
    }
  }, [user, loading, id, router])

  useEffect(() => {
    if (!user || !id) return

    const db = getFirestore()
    const commentsRef = collection(db, 'projects', user.uid, 'userProjects', id, 'comments')
    const q = query(commentsRef, orderBy('createAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createAt: doc.data().createAt?.toDate()
      }))
      setComments(commentsData)
    })

    return () => unsubscribe()
  }, [user, id])

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const db = getFirestore()
      const commentsRef = collection(db, 'projects', user.uid, 'userProjects', id, 'comments')
      await addDoc(commentsRef, {
        content: newComment.trim(),
        createAt: new Date(),
        userId: user.uid,
        userName: user.email?.split('@')[0] || '익명'
      })
      setNewComment('')
    } catch (error) {
      console.error('댓글 추가 중 오류:', error)
      alert('댓글 추가 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      const db = getFirestore();
      const commentRef = doc(db, 'projects', user.uid, 'userProjects', id, 'comments', commentId);
      await deleteDoc(commentRef);
    } catch (error) {
      console.error('댓글 삭제 중 오류:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.push('/main')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          메인으로 돌아가기
        </button>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {project.title}
              </h1>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold
                ${project.status === '진행' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                  project.status === '대기' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}
              >
                {project.status}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-600 dark:text-gray-300">가용 시간</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {project.availableHours}h
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">시작일</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{project.startDate}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">종료일</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{project.endDate}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">팀 구성원</h3>
                <div className="flex flex-wrap gap-2">
                  {project.team.map((member, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                        rounded-full text-sm border border-gray-200 dark:border-gray-500"
                    >
                      {member}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">프로젝트 설명</h3>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500 dark:text-gray-400 mt-8">
                <p>생성일: {project.createAt}</p>
                <p>최종 수정일: {project.updateAt}</p>
              </div>

              <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  댓글 ({comments.length})
                </h3>

                <form onSubmit={handleAddComment} className="mb-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="댓글을 입력하세요"
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !newComment.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                        transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '등록 중...' : '등록'}
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {comment.userName}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {comment.createAt.toLocaleString()}
                          </span>
                        </div>
                        {comment.userId === user.uid && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 
                              dark:hover:text-red-300 transition-colors"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">
                        {comment.content}
                      </p>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400">
                      아직 댓글이 없습니다.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => router.push('/main')}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                  transition-colors duration-200 text-sm sm:text-base font-medium"
              >
                목록으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}