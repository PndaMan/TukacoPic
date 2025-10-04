from django.contrib import admin
from .models import Photo, Vote, UserProfile, Friendship, Reaction, Achievement, UserAchievement


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ['id', 'uploader', 'elo_score', 'created_at']
    list_filter = ['created_at']
    search_fields = ['uploader__username']
    readonly_fields = ['created_at']
    ordering = ['-elo_score', '-created_at']


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'voter', 'winner', 'loser', 'voted_at']
    list_filter = ['voted_at']
    search_fields = ['voter__username']
    readonly_fields = ['voted_at']
    ordering = ['-voted_at']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'get_badge', 'created_at']
    search_fields = ['user__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ['id', 'from_user', 'to_user', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['from_user__username', 'to_user__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'photo', 'reaction_type', 'created_at']
    list_filter = ['reaction_type', 'created_at']
    search_fields = ['user__username']
    readonly_fields = ['created_at']


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'icon', 'difficulty', 'points']
    list_filter = ['difficulty']
    search_fields = ['name']


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'achievement', 'unlocked_at']
    list_filter = ['achievement', 'unlocked_at']
    search_fields = ['user__username', 'achievement__name']
    readonly_fields = ['unlocked_at']