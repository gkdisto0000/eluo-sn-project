'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { Header } from '@/components/Header'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'
import '@/styles/main.css'
import '@/styles/content.css'

export default function MainPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { darkMode } = useTheme()
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('전체')
  const [dateFilter, setDateFilter] = useState('전체')
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (user) {
      fetchUserProjects(user.uid)
    }
  }, [user])

  const fetchUserProjects = async (userId) => {
    if (!userId) return;

    try {
      const db = getFirestore()
      const userProjectsRef = collection(db, 'projects', userId, 'userProjects')
      const q = query(userProjectsRef, orderBy('createAt', 'desc'))
      
      const querySnapshot = await getDocs(q)
      
      const projectsList = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || '제목 없음',
          description: data.description || '',
          status: data.status || '대기',
          availableHours: data.availableHours || 0,
          team: data.team || [],
          startDate: data.startDate,
          endDate: data.endDate,
          createAt: data.createAt,
          updateAt: data.updateAt
        }
      })

      setProjects(projectsList)
    } catch (error) {
      console.error('프로젝트 데이터 가져오기 오류:', error)
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }

  // 상태 필터링 함수 (1차)
  const getStatusFilteredProjects = (projects, statusFilter) => {
    return projects.filter(project => 
      statusFilter === '전체' || project.status === statusFilter
    );
  };

  // 날짜 필터링 함수 (2차)
  const getDateFilteredProjects = (projects, dateFilter) => {
    if (dateFilter === '전체') return projects;
    if (dateFilter === '기간' && (!customStartDate || !customEndDate)) return projects;

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    return projects.filter(project => {
      const startDate = project.startDate?.toDate();
      if (!startDate) return false;

      if (dateFilter === '기간') {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return startDate >= start && startDate <= end;
      }

      const timeDiff = now.getTime() - startDate.getTime();

      switch (dateFilter) {
        case '1주일':
          return timeDiff <= (7 * oneDay);
        case '1개월':
          return timeDiff <= (30 * oneDay);
        case '3개월':
          return timeDiff <= (90 * oneDay);
        default:
          return true;
      }
    });
  };

  // 필터링 적용 (1차 -> 2차 순서로) 및 날짜순 정렬
  const statusFilteredProjects = getStatusFilteredProjects(projects, statusFilter);
  const filteredProjects = getDateFilteredProjects(statusFilteredProjects, dateFilter)
    .sort((a, b) => {
      const dateA = a.startDate?.toDate() || new Date(0);
      const dateB = b.startDate?.toDate() || new Date(0);
      return dateB - dateA; // 최신 날짜순 정렬
    });

  console.log('태 필터링 후 프로젝트 수:', statusFilteredProjects.length);
  console.log('날짜 필터링 후 프로젝트 수:', filteredProjects.length);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              내 프로젝트 목록 
              <span className="ml-2 text-sm sm:text-base text-gray-500 dark:text-gray-400">
                (총 {filteredProjects.length}개)
              </span>
            </h1>
            
            <div className="flex flex-col w-full sm:w-auto gap-2">
              <div className="flex flex-wrap gap-2 w-full sm:w-[400px]">
                {['전체', '진행', '대기', '종료'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`w-[calc(25%-6px)] px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all
                      ${statusFilter === status
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-[400px]">
                {['전체', '1주일', '1개월', '3개월'].map((date) => (
                  <button
                    key={date}
                    onClick={() => setDateFilter(date)}
                    className={`w-[calc(25%-6px)] px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all
                      ${dateFilter === date
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                  >
                    {date}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 w-full sm:w-[400px]">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    if (e.target.value && customEndDate) {
                      setDateFilter('기간 지정');
                    }
                  }}
                  className="w-[calc(50%-13px)] sm:w-[189px] px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                    hover:border-blue-500 dark:hover:border-blue-500 transition-colors
                    text-center [&::-webkit-calendar-picker-indicator]:cursor-pointer
                    [&::-webkit-calendar-picker-indicator]:p-0
                    [&::-webkit-calendar-picker-indicator]:m-0
                    [&::-webkit-calendar-picker-indicator]:h-5
                    [&::-webkit-calendar-picker-indicator]:w-5
                    [&::-webkit-calendar-picker-indicator]:opacity-100
                    [&::-webkit-calendar-picker-indicator]:invert-[1]
                    dark:[&::-webkit-calendar-picker-indicator]:invert-[0]
                    "
                />
                <span className="flex items-center text-gray-500 dark:text-gray-400 w-[18px] justify-center">~</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    if (customStartDate && e.target.value) {
                      setDateFilter('기간 지정');
                    }
                  }}
                  className="w-[calc(50%-13px)] sm:w-[189px] px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                    hover:border-blue-500 dark:hover:border-blue-500 transition-colors
                    text-center [&::-webkit-calendar-picker-indicator]:cursor-pointer
                    [&::-webkit-calendar-picker-indicator]:p-0
                    [&::-webkit-calendar-picker-indicator]:m-0
                    [&::-webkit-calendar-picker-indicator]:h-5
                    [&::-webkit-calendar-picker-indicator]:w-5
                    [&::-webkit-calendar-picker-indicator]:opacity-100
                    [&::-webkit-calendar-picker-indicator]:invert-[1]
                    dark:[&::-webkit-calendar-picker-indicator]:invert-[0]
                    "
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/detail/${project.id}`)}
                className={`
                  filtered-project
                  rounded-xl shadow-md
                  transition-all duration-200 ease-in-out 
                  p-4 sm:p-6 cursor-pointer 
                  border border-gray-100 dark:border-gray-700
                  ${project.status === '종료' 
                    ? 'bg-gray-200 dark:bg-gray-900 opacity-75 dark:opacity-100 hover:opacity-100 hover:shadow-lg hover:border-red-200 dark:hover:border-red-800 hover:bg-gray-100 dark:hover:bg-gray-800' 
                    : 'bg-white dark:bg-gray-800 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-1 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }
                `}
              >
                <div className="h-full flex flex-col">
                  <div className="mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
                        {project.title}
                      </h3>
                      <div className={`ml-2 px-2.5 py-1 text-xs sm:text-sm rounded-full whitespace-nowrap
                        ${project.status === '진행' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                          project.status === '대기' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}
                      >
                        {project.status}
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  <div className="mt-auto space-y-3">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">시작일:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {project.startDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">종료일:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {project.endDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">가용 시간:</span>
                      <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                        {project.availableHours}h
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {project.team.map((member, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 
                            text-gray-700 dark:text-gray-300 rounded-full"
                        >
                          {member}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  {statusFilter === '전체' && dateFilter === '전체'
                    ? '등록된 프로젝트가 없습니다.'
                    : statusFilter !== '전체' && dateFilter === '전체'
                    ? `${statusFilter} 상태의 프로젝트가 없습니다.`
                    : statusFilter === '전체' && dateFilter !== '전체'
                    ? `${dateFilter} 이내에 시작된 프로젝트가 없습니다.`
                    : `${statusFilter} 상태의 프로젝트 중 ${dateFilter} 이내에 시작된 프로젝트가 없습니다.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 