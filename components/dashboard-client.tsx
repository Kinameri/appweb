"use client"

import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import RecipesTab from "@/components/recipes-tab"
import MealPlannerTab from "@/components/meal-planner-tab"
import ShoppingListTab from "@/components/shopping-list-tab"
import ProfileTab from "@/components/profile-tab"
import WeeklyPlannerTab from "@/components/weekly-planner-tab"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("today")

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">MealHub</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={() => setActiveTab("profile")}>
              Profile
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="shopping">Shopping</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <MealPlannerTab />
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            <RecipesTab currentUserId={user.id} />
          </TabsContent>

          <TabsContent value="shopping" className="space-y-4">
            <ShoppingListTab />
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <WeeklyPlannerTab />
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <ProfileTab user={user} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
