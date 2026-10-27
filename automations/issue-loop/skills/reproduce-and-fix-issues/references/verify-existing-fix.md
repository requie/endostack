# Measuring a fix someone else wrote

Come here from step 3 of the reproduce operational file, when a pull request (open or already merged) or a merged commit looks like it resolves the report. Your task is measurement: run the real UI on the code without the change and on the code with it, then report what each run showed. The existing change stays untouched. You write no alternative patch and open no pull request of your own.

## Which artifacts qualify

Three things qualify. The first is an open pull request whose diff deals with the symptom. The second is a pull request that has been merged. The third is a merged commit whose code and message both line up with the report. Things that do not qualify: a "fixed" comment, a status change in the tracker, a branch whose name sounds right, or a theory with no code behind it.

When more than one candidate exists, take the one the report or tracker item links to. Without such a link, take the candidate nearest the affected code and note your reasoning.

Code from a fork's pull request is untrusted. Build and run it inside the reproduction sandbox and nowhere else, with no write tokens present, and keep its install scripts and CI changes from running outside that sandbox.

## Steps

1. **Leave existing work intact.** Do the measurement in a separate worktree or a fresh checkout so uncommitted changes are never overwritten. Write down four things before starting: the baseline revision, the patched revision, the artifact's URL, and the build and environment inputs that both runs will use.
2. **Measure the baseline.** The baseline for an open pull request is the branch it targets. For a merged change, the baseline is the parent revision, provided it builds and still shows the old behavior. Using the adapter, start the app, confirm the app and environment, and drive the reported path with real interface actions until the symptom shows. Reset and do it again. Collect a recording, a screenshot, and one read-only check of a state value. Two sightings of the symptom are required. With fewer, there is no baseline, and you cannot claim the fix works.
3. **Measure the patched build.** Keep the environment, the data, and the UI path identical, and run it two times. Check that the broken state has gone and the expected one shows up. Collect the after recording, the after screenshot, and the same state check. The verdict has to come from the patched app actually running. A successful build or passing tests do not settle it.
4. **Choose one of three results.**
   - **Fix confirmed.** The symptom appeared twice on the baseline and was absent twice on the patched build. Set the status to verified, link the artifact, run preflight, and post one short reply on the report comparing the two builds. Do not open a pull request.
   - **Fix does not work.** Both builds show the symptom. Set the status to reproduced, link the artifact, and state that it leaves the symptom in place. If you have not yet posted the confirmed-reproduction reply, post it now. Do not open a pull request to compete with it.
   - **Cannot tell.** The baseline never reproduced, the patched app failed to start, or the captured evidence does not display the state that separates broken from correct. Make no claim about the fix. Record which of the two measurements is missing, in the operations location if one exists or in the run output otherwise. Stay silent on the report unless someone asks you a direct question.
5. **Tidy up.** Shut down both builds. Delete temporary profiles, and delete captures once the retention setting allows. Put the repository back the way you found it, and discard nobody's work in the process.
