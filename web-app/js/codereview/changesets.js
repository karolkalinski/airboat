function showProject(projectName) {
    $.observable(codeReview).setProperty('displayedProjectName', projectName);
    changesetsLoading = true;
    $.getJSON(uri.changeset.getLastChangesets + '?' + $.param({projectName:codeReview.displayedProjectName}),
        function (data) {
            clearDisplayAndAppendChangesetsBottom({data:data, shouldLoad:true, viewType:VIEW_TYPE.PROJECT, activeSelector:'#projectsDropdown'})
        });
}

function showFiltered(filterType) {
    $.observable(codeReview).setProperty('currentFilter', filterType);
    codeReview.changesetLoading = true;
    $.getJSON(uri.changeset.getLastFilteredChangesets + '?' + $.param({filterType:codeReview.currentFilter}),
        function (data) {
            clearDisplayAndAppendChangesetsBottom({data:data, shouldLoad:true, viewType:VIEW_TYPE.FILTER, activeSelector:'#filtersDropdown'})
        });
}

function clearDisplayAndAppendChangesetsBottom(dataset) {
    shouldLoadChangesets = dataset.shouldLoad;
    currentViewType = dataset.viewType;
    $('#content').html("");
    setActive(dataset.activeSelector)
    appendChangesetsBottom(dataset.data.changesets);
    decideImportInfoAndLoadingState(dataset.data, 21); //as in Constants.FIRST_LOAD_CHANGESET_NUMBER
}

function appendNextChangesetsBottom(dataset) {
    appendChangesetsBottom(dataset.changesets);
    decideImportInfoAndLoadingState(dataset, 10); //as in Constants.NEXT_LOAD_CHANGESET_NUMBER
}

function decideImportInfoAndLoadingState(data, maxChangesetSize) {
    showImportGritter(data.isImporting);
    if (countChangesets(data.changesets) < maxChangesetSize) {
        $('#content').append($('#noMoreChangesetsTemplate').render());
        shouldLoadChangesets = false;
    }
}

var importGritter
function showImportGritter(isImporting) {
    var importInfo;
    var shouldHide = false;
    if (currentViewType == VIEW_TYPE.PROJECT && codeReview.displayedProjectName != '') {
        importInfo = 'Import is in progress, older changesets may not by imported yet.'
        shouldHide = true;
    } else {
        importInfo = 'Import is in progress, some changesets may not be displayed. To see all changesets wait' +
            ' a while and refresh page or go into single project view.'
    }
    if (importGritter != null && (shouldHide || isImporting)) {
        $.gritter.remove(importGritter, {fade:false});
    }
    if (isImporting) {
        importGritter = $.gritter.add({
            title:'Import in progress',
            text:importInfo,
            sticky:true
        });
    }
}

function countChangesets(changesetsByDay) {
    var counter = 0;
    for (day in changesetsByDay) {
        counter += changesetsByDay[day].length;
    }
    return counter;
}

function setActive(selector) {
    setAllInactive();
    $(selector + ' .dropdown-toggle').css('text-decoration', 'underline');
}

function setAllInactive() {
    $('.navbarToggle .dropdown-toggle').css('text-decoration', 'none');
}

function onScrollThroughBottomAttempt() {
    loadMoreChangesets();
}

function loadMoreChangesets() {
    if (!changesetsLoading && shouldLoadChangesets) {
        changesetsLoading = true;
        var controllerAction;
        var paramsMap = {changesetId:lastLoadedChangesetId};
        if (history.state.dataType == DATA_TYPE.PROJECT && codeReview.displayedProjectName == '') {
            controllerAction = uri.changeset.getNextFewChangesetsOlderThan;
        } else if (history.state.dataType == DATA_TYPE.PROJECT) {
            controllerAction = uri.changeset.getNextFewChangesetsOlderThanFromSameProject;
        } else if (history.state.dataType == DATA_TYPE.FILTER) {
            controllerAction = uri.changeset.getNextFewFilteredChangesetsOlderThan;
            paramsMap['filterType'] = codeReview.currentFilter;
        }
        $.getJSON(controllerAction + '?' + $.param(paramsMap), function (data) {
            appendNextChangesetsBottom(data)
        });
    }
}

var lastLoadedChangesetId;
var changesetsLoading;
var shouldLoadChangesets;
var currentViewType;

function appendChangesetsBottom(changesetsByDay) {
    for (var day in changesetsByDay) {
        //find or create day container
        var dayElement = getDayContainer(day);
        if (dayElement.length == 0) {
            //create new day element
            $('#content').append($("#dayTemplate").render({date:day}));
        }
        dayElement = getDayContainer(day);
        var changesetsForDay = changesetsByDay[day];
        for (var i = 0; i < changesetsForDay.length; i++) {
            appendChangeset(changesetsForDay[i], dayElement);
            lastLoadedChangesetId = changesetsForDay[i].id;
        }
    }
    changesetsLoading = false;
}

function getDayContainer(date) {
    return $(".day[data-date=" + date + "]");
}

$('.changeset-hash').livequery(function () {
    $(this)
        .hover(function () {
            $('.clippy-' + this.dataset.changeset_identifier)
                .clippy({
                    clippy_path:uri.libs.clippy.swf
                });
            showClippyAndTooltip.call(this);
        }, function () {
            var that = this;
            setTimeout(function () {
                hideSpanForClippy(that);
                removeClippyObject(that);
            }, 5000)
        });
});

function hideSpanForClippy(that) {
    $('.hashForClippy-' + that.dataset.changeset_identifier).hide()
}

function showClippyAndTooltip() {
    $('.hashForClippy-' + this.dataset.changeset_identifier)
        .tooltip({title:"click to copy", trigger:"hover", placement:"bottom"})
        .show();
}

function removeClippyObject(that) {
    swfobject.removeSWF(that.dataset.changeset_identifier);
}

$('.changeset-date').livequery(function () {
    $(this).tooltip({title:this.dataset.date, trigger:"hover", placement:"bottom"});
});

function appendChangeset(changeset, dayElement) {

    changeset['shortIdentifier'] = changeset.identifier.substr(0, hashAbbreviationLength) + "...";
    changeset['allComments'] = function () {
        var projectFilesComments = 0;
        $(this.projectFiles).each(function () {
            projectFilesComments += this.commentsCount
        });
        return this.comments.length + projectFilesComments
    };

    $(changeset.projectFiles).each(function () {
        $.extend(this, {
            changeset:changeset,
            collapseId:(changeset.identifier + this.id),
            name:sliceName(this.name),
            isDisplayed:false
        })
    });

    dayElement.children('.changesets').append($("<span id='templatePlaceholder'></span>"));
    $.link.changesetTemplate('#templatePlaceholder', changeset, {target:'replace'});

    $('#comment-form-' + changeset.identifier).append($("#commentFormTemplate").render(changeset));
}

/*TODO move it somewhere near the template definition*/
$('.projectFile .accordion-body.collapse').livequery(function () {
    $(this)
        .on('show',function (event) {
            if (this.dataset.projectfile_comments == 0) {
                event.preventDefault();
            }
            appendSnippetAndShowFile.call(this);
            $.observable(codeReview.getModel(this)).setProperty('isDisplayed', true);
        });
});

function appendSnippetAndShowFile() {
    appendSnippetToFileInAccordion(this.dataset.changeset_id, this.dataset.file_id);
    showFile(this.dataset);
}

function updateAccordion(threadGroupsWithSnippetsForCommentedFile, changesetIdentifier, projectFileId) {
    renderCommentGroupsWithSnippets(changesetIdentifier, projectFileId, threadGroupsWithSnippetsForCommentedFile);
    var projectFile = codeReview.getModel('.changeset[data-identifier=' + changesetIdentifier + '] .projectFile[data-id=' + projectFileId + ']');
    $.observable(projectFile).setProperty('commentsCount', threadGroupsWithSnippetsForCommentedFile.commentsCount);
    $.observable(codeReview.getModel('.changeset[data-identifier=' + changesetIdentifier + ']')).setProperty('allComments')
}

function appendSnippetToFileInAccordion(changesetIdentifier, projectFileId) {
    $.getJSON(uri.projectFile.getLineCommentsWithSnippetsToFile + '?' + $.param({
        changesetIdentifier:changesetIdentifier, projectFileId:projectFileId
    }),
        function (threadGroupsWithSnippetsForFile) {
            renderCommentGroupsWithSnippets(changesetIdentifier, projectFileId, threadGroupsWithSnippetsForFile);
        }
    );
}

function renderCommentGroupsWithSnippets(changesetIdentifier, projectFileId, threadGroupsWithSnippetsForFile) {
    var fileType = threadGroupsWithSnippetsForFile.fileType;
    var threadGroupsWithSnippets = threadGroupsWithSnippetsForFile.threadGroupsWithSnippets;

    if (threadGroupsWithSnippets.length > 0) {
        $('#fileComments-' + changesetIdentifier + projectFileId).html("");

        for (var j = 0; j < threadGroupsWithSnippets.length; j++) {
            renderCommentGroupWithSnippets(changesetIdentifier, projectFileId, threadGroupsWithSnippets[j], fileType);
        }
    }
}

function renderCommentGroupWithSnippets(changesetIdentifier, projectFileId, threadGroupWithSnippet, fileType) {
    var lineNumber = threadGroupWithSnippet.lineNumber;

    var snippet = $("#snippetTemplate").render({
        fileId:projectFileId,
        lineNumber:lineNumber,
        changesetId:changesetIdentifier
    });

    var fileComments = $('#fileComments-' + changesetIdentifier + projectFileId);
    var snippetObject = $(snippet).appendTo(fileComments);

    snippetObject.children('.codeSnippet')
        .html("<pre class='codeViewer'/></pre>")
        .children(".codeViewer")
        .text(threadGroupWithSnippet.snippet)
        .addClass("linenums:" + lineNumber)
        .addClass("language-" + fileType)
        .syntaxHighlight();

    for (i = 0; i < threadGroupWithSnippet.threads.length; i++) {
        var threadTemplate = $("#threadTemplate").render({threadId: threadGroupWithSnippet.threads[i].threadId, changesetId: changesetIdentifier, projectFileId: projectFileId});
        $(threadTemplate).appendTo(snippetObject.find('.threads'));
        var commentsInThread = snippetObject.find('.threadComments[data-identifier=' + threadGroupWithSnippet.threads[i].threadId + ']');
        renderCommentGroup(commentsInThread, threadGroupWithSnippet.threads[i].comments);
    }
}

function renderCommentGroup(object, commentGroup) {
    for (var k = 0; k < commentGroup.length; k++) {
        var comment = $("#commentTemplate").render(commentGroup[k]);
        object.append(comment);
    }
}

function sliceName(name) {
    return name.toString().replace(/\//g, '/&#8203;');
}

function toggleChangesetDetails(identifier) {
    var changesetDetails = $('#changesetDetails-' + identifier);
    if (changesetDetails.is(':visible')) {
        changesetDetails.slideUp('slow', function () {
            hideFileListings($('.changeset[data-identifier=' + identifier + '] .fileListing'));

            //TODO make the hideFileListings give a callback after all file listings are hidden,
            // or deal with the following. Providing the mentioned callback is not-so-straightforward, as $().hide()
            // calls its callback for every hidden element...
            var fileListingsWrapper = $('.changeset[data-identifier=' + identifier + '] .fileListings');
            fileListingsWrapper.hide(0, function () {
                $('.changeset[data-identifier=' + identifier + ']').ScrollTo({
                    callback:function () {
                        fileListingsWrapper.show();
                    }
                });
            });
        });
    } else {
        changesetDetails.slideDown();
    }
}

