                  <div className="flex items-center gap-2 text-violet-300 mb-2"><Music className="h-4 w-4" /><span className="text-xs font-bold tracking-widest">LIVE</span></div>
                  <div className="font-bold">{s.title}</div>
                  <div className="text-xs text-white/50 mt-1">{s.host?.stage_name || s.host?.display_name || "BWF host"}</div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}