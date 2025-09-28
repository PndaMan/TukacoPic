from django.contrib import admin
from .models import Photo, Vote


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